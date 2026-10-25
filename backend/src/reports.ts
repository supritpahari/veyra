import { Router } from 'express'
import type {
  Measurement as PrismaMeasurement,
  Report as PrismaReport,
} from '@prisma/client'
import { z } from 'zod'
import { analyzeMeasurements } from './analysis.js'
import { prisma } from './db.js'
import type { Measurement, Report } from './types.js'

const router = Router()

function mapMeasurement(row: PrismaMeasurement): Measurement {
  return {
    id: row.id,
    reportId: row.reportId,
    testName: row.testName,
    normalizedName: row.normalizedName,
    value: row.value.toNumber(),
    unit: row.unit,
    referenceLow: row.referenceLow?.toNumber() ?? null,
    referenceHigh: row.referenceHigh?.toNumber() ?? null,
    sourceText: row.sourceText,
    extractionConfidence: row.extractionConfidence?.toNumber() ?? null,
    collectedAt: row.collectedAt?.toISOString().slice(0, 10) ?? null,
  }
}

function mapReport(row: PrismaReport & { measurements: PrismaMeasurement[] }): Report {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.sourceType,
    createdAt: row.createdAt.toISOString(),
    measurements: row.measurements.map(mapMeasurement),
  }
}

async function findReport(id: string): Promise<Report | null> {
  const row = await prisma.report.findUnique({
    where: { id },
    include: {
      measurements: {
        orderBy: [{ collectedAt: 'asc' }, { testName: 'asc' }, { id: 'asc' }],
      },
    },
  })

  return row ? mapReport(row) : null
}

router.get('/', async (_request, response) => {
  const rows = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, sourceType: true, createdAt: true },
  })

  response.json({
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      sourceType: row.sourceType,
      createdAt: row.createdAt.toISOString(),
    })),
  })
})

router.get('/:reportId', async (request, response) => {
  const report = await findReport(request.params.reportId!)
  if (!report) {
    response.status(404).json({ error: { code: 'report_not_found' } })
    return
  }

  response.json({ data: report })
})

router.get('/:reportId/analysis', async (request, response) => {
  const report = await findReport(request.params.reportId!)
  if (!report) {
    response.status(404).json({ error: { code: 'report_not_found' } })
    return
  }

  response.json({
    data: analyzeMeasurements(report.id, report.sourceType, report.measurements),
  })
})

const simulationSchema = z.object({
  measurementId: z.string().uuid(),
  value: z.number().finite(),
})

router.post('/:reportId/simulations', async (request, response) => {
  const parsed = simulationSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'Provide a UUID measurementId and a finite numeric value.',
        details: parsed.error.flatten().fieldErrors,
      },
    })
    return
  }

  const report = await findReport(request.params.reportId!)
  if (!report) {
    response.status(404).json({ error: { code: 'report_not_found' } })
    return
  }

  const target = report.measurements.find(
    (measurement) => measurement.id === parsed.data.measurementId,
  )
  if (!target) {
    response.status(404).json({ error: { code: 'measurement_not_found' } })
    return
  }

  const simulatedMeasurements = report.measurements.map((measurement) =>
    measurement.id === target.id
      ? { ...measurement, value: parsed.data.value }
      : measurement,
  )
  const originalAnalysis = analyzeMeasurements(
    report.id,
    report.sourceType,
    report.measurements,
  )
  const simulatedAnalysis = analyzeMeasurements(
    report.id,
    report.sourceType,
    simulatedMeasurements,
  )
  const originalStatus = originalAnalysis.measurements.find(
    (measurement) => measurement.id === target.id,
  )!.status
  const simulatedStatus = simulatedAnalysis.measurements.find(
    (measurement) => measurement.id === target.id,
  )!.status

  response.json({
    data: {
      persisted: false,
      disclaimer:
        'This synthetic, one-value comparison is not a prediction of a clinical outcome.',
      changedMeasurement: {
        measurementId: target.id,
        originalValue: target.value,
        simulatedValue: parsed.data.value,
        originalStatus,
        simulatedStatus,
        statusChanged: originalStatus !== simulatedStatus,
      },
      originalAnalysis,
      simulatedAnalysis,
    },
  })
})

export default router

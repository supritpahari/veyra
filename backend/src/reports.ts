import express, { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import type {
  Measurement as PrismaMeasurement,
  Report as PrismaReport,
} from '@prisma/client'
import { z } from 'zod'
import { analyzeMeasurements } from './analysis.js'
import { requireAuthentication } from './auth-middleware.js'
import { prisma } from './db.js'
import { extractPdfReport, PdfExtractionError } from './pdf-extraction.js'
import type { Measurement, Report } from './types.js'

const router = Router()
const pdfUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_request, response) {
    response.status(429).json({ error: { code: 'too_many_pdf_extractions' } })
  },
})
const pdfBodyParser = express.raw({
  type: 'application/pdf',
  limit: '15mb',
})

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

router.post(
  '/extract',
  requireAuthentication,
  pdfUploadRateLimit,
  pdfBodyParser,
  async (request, response, next) => {
    const contentType = request.get('content-type')?.split(';', 1)[0]?.trim()
    if (contentType?.toLowerCase() !== 'application/pdf') {
      response.status(415).json({
        error: {
          code: 'unsupported_media_type',
          message: 'Send a PDF as the raw request body.',
        },
      })
      return
    }
    if (!Buffer.isBuffer(request.body)) {
      response.status(400).json({ error: { code: 'empty_pdf' } })
      return
    }

    try {
      response.json({ data: await extractPdfReport(request.body) })
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        response.status(error.status).json({ error: { code: error.code } })
        return
      }
      next(error)
    }
  },
)

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

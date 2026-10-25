import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const reports = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Synthetic sample - within supplied ranges',
    measurements: [
      {
        id: '11111111-aaaa-4111-8111-111111111111',
        testName: 'Synthetic Marker A',
        normalizedName: 'synthetic_marker_a',
        value: '5.2',
        unit: 'units',
        referenceLow: '2.0',
        referenceHigh: '8.0',
        sourceText:
          'Synthetic Marker A: 5.2 units (reference: 2.0-8.0)',
        extractionConfidence: '1.0000',
        collectedAt: new Date('2026-01-15T00:00:00.000Z'),
      },
      {
        id: '11111111-aaaa-4111-8111-222222222222',
        testName: 'Synthetic Marker B',
        normalizedName: 'synthetic_marker_b',
        value: '11.4',
        unit: 'units',
        referenceLow: '4.0',
        referenceHigh: '10.0',
        sourceText:
          'Synthetic Marker B: 11.4 units (reference: 4.0-10.0)',
        extractionConfidence: '1.0000',
        collectedAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Synthetic sample - review needed',
    measurements: [
      {
        id: '22222222-aaaa-4222-8222-111111111111',
        testName: 'Synthetic Marker C',
        normalizedName: 'synthetic_marker_c',
        value: '3.1',
        unit: null,
        referenceLow: '2.0',
        referenceHigh: '5.0',
        sourceText: 'Synthetic Marker C: 3.1 (reference: 2.0-5.0)',
        extractionConfidence: '0.6200',
        collectedAt: new Date('2026-02-03T00:00:00.000Z'),
      },
      {
        id: '22222222-aaaa-4222-8222-222222222222',
        testName: 'Synthetic Marker D',
        normalizedName: 'synthetic_marker_d',
        value: '7.5',
        unit: 'units',
        referenceLow: null,
        referenceHigh: null,
        sourceText: 'Synthetic Marker D: 7.5 units',
        extractionConfidence: '1.0000',
        collectedAt: new Date('2026-02-03T00:00:00.000Z'),
      },
    ],
  },
]

async function seed() {
  for (const report of reports) {
    await prisma.report.upsert({
      where: { id: report.id },
      update: { title: report.title },
      create: { id: report.id, title: report.title },
    })

    for (const measurement of report.measurements) {
      await prisma.measurement.upsert({
        where: { id: measurement.id },
        update: {
          reportId: report.id,
          ...measurement,
        },
        create: {
          reportId: report.id,
          ...measurement,
        },
      })
    }
  }
}

seed()
  .catch((error: unknown) => {
    console.error('Unable to seed synthetic demo reports:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

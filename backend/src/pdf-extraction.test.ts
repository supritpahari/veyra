import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractPdfReport,
  parseMeasurementsFromText,
  PdfExtractionError,
} from './pdf-extraction.js'

function createTextPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 50 740 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf)
}

test('extracts values, units, ranges, and source evidence from laboratory rows', () => {
  const measurements = parseMeasurementsFromText(
    [
      'Hemoglobin 13.5 g/dL 12.0 - 16.0',
      'Glucose 105 mg/dL 70-99',
      'HbA1c 5.8 % < 5.7',
    ].join('\n'),
    2,
    0.9,
    '2026-10-20',
  )

  assert.deepEqual(
    measurements.map(
      ({
        testName,
        normalizedName,
        value,
        unit,
        referenceLow,
        referenceHigh,
        referenceRangeText,
        page,
        confidence,
        reviewStatus,
      }) => ({
        testName,
        normalizedName,
        value,
        unit,
        referenceLow,
        referenceHigh,
        referenceRangeText,
        page,
        confidence,
        reviewStatus,
      }),
    ),
    [
      {
        testName: 'Hemoglobin',
        normalizedName: 'hemoglobin',
        value: 13.5,
        unit: 'g/dL',
        referenceLow: 12,
        referenceHigh: 16,
        referenceRangeText: '12.0 - 16.0',
        page: 2,
        confidence: 0.9,
        reviewStatus: 'needs_review',
      },
      {
        testName: 'Glucose',
        normalizedName: 'glucose',
        value: 105,
        unit: 'mg/dL',
        referenceLow: 70,
        referenceHigh: 99,
        referenceRangeText: '70-99',
        page: 2,
        confidence: 0.9,
        reviewStatus: 'needs_review',
      },
      {
        testName: 'HbA1c',
        normalizedName: 'hba1c',
        value: 5.8,
        unit: '%',
        referenceLow: null,
        referenceHigh: null,
        referenceRangeText: '< 5.7',
        page: 2,
        confidence: 0.9,
        reviewStatus: 'needs_review',
      },
    ],
  )
  assert.equal(measurements[0]?.sourceText, 'Hemoglobin 13.5 g/dL 12.0 - 16.0')
  assert.equal(measurements[0]?.collectedAt, '2026-10-20')
})

test('keeps ambiguous or incomplete results instead of inventing details', () => {
  const measurements = parseMeasurementsFromText(
    'Vitamin D, 25-OH 22 ng/mL\nWBC 5.4 4.0 - 10.0',
    1,
    0.65,
  )

  assert.equal(measurements.length, 2)
  assert.equal(measurements[0]?.testName, 'Vitamin D, 25-OH')
  assert.equal(measurements[0]?.value, 22)
  assert.equal(measurements[0]?.referenceLow, null)
  assert.equal(measurements[0]?.referenceHigh, null)
  assert.equal(measurements[1]?.unit, null)
  assert.equal(measurements[1]?.referenceLow, 4)
  assert.equal(measurements[1]?.referenceHigh, 10)
  assert.equal(measurements[0]?.confidence, 0.65)
})

test('does not emit duplicate copies of a result on the same page', () => {
  const measurements = parseMeasurementsFromText(
    'Sodium 140 mmol/L 135-145\nSodium 140 mmol/L 135-145',
    1,
    0.9,
  )

  assert.equal(measurements.length, 1)
})

test('extracts structured measurements from a real PDF text layer', async () => {
  const result = await extractPdfReport(
    createTextPdf('Hemoglobin 13.5 g/dL 12.0 - 16.0'),
  )

  assert.equal(result.document.pageCount, 1)
  assert.deepEqual(result.document.ocrPages, [])
  assert.equal(result.measurements.length, 1)
  assert.equal(result.measurements[0]?.testName, 'Hemoglobin')
  assert.equal(result.measurements[0]?.value, 13.5)
  assert.equal(result.measurements[0]?.referenceLow, 12)
  assert.equal(result.measurements[0]?.referenceHigh, 16)
})

test('rejects non-PDF input with a specific extraction error', async () => {
  await assert.rejects(
    extractPdfReport(Buffer.from('not a PDF')),
    (error) =>
      error instanceof PdfExtractionError &&
      error.code === 'invalid_pdf' &&
      error.status === 400,
  )
})

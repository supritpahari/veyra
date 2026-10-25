import { createCanvas } from '@napi-rs/canvas'
import {
  getDocument,
  type PDFPageProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorker, type Worker } from 'tesseract.js'

const maximumPages = 25
const minimumPageTextLength = 80
const ocrMaximumDimension = 2400

export class PdfExtractionError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
    this.name = 'PdfExtractionError'
  }
}

export interface ExtractedMeasurement {
  testName: string
  normalizedName: string
  value: number
  unit: string | null
  referenceLow: number | null
  referenceHigh: number | null
  referenceRangeText: string | null
  collectedAt: string | null
  sourceText: string
  page: number
  confidence: number
  reviewStatus: 'needs_review'
}

export interface ExtractionQualityIssue {
  code: 'no_measurements_found' | 'missing_unit' | 'missing_reference_range'
  message: string
  page?: number
}

export interface PdfExtractionResult {
  document: {
    pageCount: number
    ocrPages: number[]
  }
  measurements: ExtractedMeasurement[]
  qualityIssues: ExtractionQualityIssue[]
}

interface ParsedLineMeasurement {
  testName: string
  value: number
  unit: string | null
  referenceLow: number | null
  referenceHigh: number | null
  referenceRangeText: string | null
  sourceText: string
}

interface PositionedTextItem {
  str: string
  transform: number[]
}

const numberPattern = '[+-]?\\d+(?:[.,]\\d+)?'
const rangePattern = new RegExp(
  `(?:^|\\s|\\()(${numberPattern})\\s*(?:-|–|—|\\bto\\b)\\s*(${numberPattern})(?=$|\\s|\\))`,
  'i',
)
const singleBoundPattern = new RegExp(
  `(?:^|\\s|\\()([<>≤≥]=?\\s*${numberPattern})(?=$|\\s|\\))`,
)

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseLine(line: string): ParsedLineMeasurement | null {
  const cleaned = line.replace(/\s+/g, ' ').trim()
  if (cleaned.length < 4 || cleaned.length > 500) return null

  const valuePattern = new RegExp(`(${numberPattern})(?=\\s|$)`, 'g')
  for (const match of cleaned.matchAll(valuePattern)) {
    const valueIndex = match.index
    const valueText = match[1]
    if (valueIndex === undefined || !valueText) continue

    const testName = cleaned
      .slice(0, valueIndex)
      .replace(/^[\s•*:#-]+|[\s:=-]+$/g, '')
      .trim()
    if (testName.length < 2 || testName.length > 120) continue

    const value = parseNumber(valueText)
    if (value === null) continue

    const trailingText = cleaned.slice(valueIndex + valueText.length).trim()
    const rangeMatch = rangePattern.exec(trailingText)
    const boundMatch = singleBoundPattern.exec(trailingText)
    const unitCandidate = trailingText.match(
      /^([A-Za-zµμ%][A-Za-z0-9µμ/%^.*-]{0,20})(?=\s|$|\()/,
    )?.[1]
    const unit =
      unitCandidate && !/^(?:h|l|high|low|normal|abnormal|positive|negative)$/i.test(unitCandidate)
        ? unitCandidate
        : null

    if (!rangeMatch && !boundMatch && !unit) continue

    const referenceLow = rangeMatch ? parseNumber(rangeMatch[1]!) : null
    const referenceHigh = rangeMatch ? parseNumber(rangeMatch[2]!) : null
    const referenceRangeText = rangeMatch
      ? rangeMatch[0].trim().replace(/^\(/, '')
      : (boundMatch?.[1]?.trim() ?? null)

    return {
      testName,
      value,
      unit,
      referenceLow,
      referenceHigh,
      referenceRangeText,
      sourceText: cleaned,
    }
  }

  return null
}

export function parseMeasurementsFromText(
  text: string,
  page: number,
  confidence: number,
  collectedAt: string | null = null,
): ExtractedMeasurement[] {
  const measurements: ExtractedMeasurement[] = []
  const seen = new Set<string>()

  for (const line of text.split(/\r?\n/)) {
    const parsed = parseLine(line)
    if (!parsed) continue

    const normalizedName = parsed.testName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    const dedupeKey = `${normalizedName}:${parsed.value}:${parsed.unit ?? ''}`
    if (!normalizedName || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    measurements.push({
      ...parsed,
      normalizedName,
      collectedAt,
      page,
      confidence,
      reviewStatus: 'needs_review',
    })
  }

  return measurements
}

function textFromPageItems(items: readonly unknown[]): string {
  const positioned = items.filter(
    (item): item is PositionedTextItem =>
      typeof item === 'object' &&
      item !== null &&
      'str' in item &&
      'transform' in item &&
      typeof item.str === 'string' &&
      Array.isArray(item.transform) &&
      item.transform.length >= 6 &&
      item.transform.slice(4, 6).every(Number.isFinite),
  )
  const sorted = [...positioned].sort((left, right) => {
    const vertical = right.transform[5]! - left.transform[5]!
    return Math.abs(vertical) > 2.5
      ? vertical
      : left.transform[4]! - right.transform[4]!
  })

  const lines: { y: number; fragments: { x: number; text: string }[] }[] = []
  for (const item of sorted) {
    const x = item.transform[4]!
    const y = item.transform[5]!
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2.5)
    if (!line) {
      line = { y, fragments: [] }
      lines.push(line)
    }
    line.fragments.push({ x, text: item.str })
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) =>
      line.fragments
        .sort((left, right) => left.x - right.x)
        .map((fragment) => fragment.text)
        .join(' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
}

function findCollectionDate(text: string): string | null {
  const labeledDate = text.match(
    /(?:collection|collected|specimen|sample|report)\s+date\s*[:#-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  )?.[1]
  if (!labeledDate) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(labeledDate)) {
    const date = new Date(`${labeledDate}T00:00:00.000Z`)
    return Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== labeledDate
      ? null
      : labeledDate
  }

  const parts = labeledDate.split(/[/-]/).map(Number)
  if (parts.length !== 3) return null
  let [monthOrDay, dayOrMonth, year] = parts as [number, number, number]
  if (monthOrDay <= 12 && dayOrMonth <= 12) return null
  if (year < 100) year += year < 50 ? 2000 : 1900

  const month = monthOrDay > 12 ? dayOrMonth : monthOrDay
  const day = monthOrDay > 12 ? monthOrDay : dayOrMonth
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null
}

async function readPageText(
  page: PDFPageProxy,
): Promise<string> {
  const content = await page.getTextContent()
  return textFromPageItems(content.items)
}

async function recognizePage(
  page: PDFPageProxy,
  worker: Worker,
): Promise<string> {
  const initialViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(
    2,
    ocrMaximumDimension / initialViewport.width,
    ocrMaximumDimension / initialViewport.height,
  )
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  )
  const context = canvas.getContext('2d')
  await page.render({
    canvas: null,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise

  const result = await worker.recognize(canvas.toBuffer('image/png'))
  return result.data.text
}

export async function extractPdfReport(
  pdfBuffer: Buffer,
): Promise<PdfExtractionResult> {
  if (pdfBuffer.length < 8 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new PdfExtractionError('invalid_pdf', 400)
  }

  let document
  try {
    document = await getDocument({
      data: new Uint8Array(pdfBuffer),
      isEvalSupported: false,
      stopAtErrors: true,
      standardFontDataUrl: new URL(
        '../node_modules/pdfjs-dist/standard_fonts/',
        import.meta.url,
      ).href,
      useSystemFonts: true,
    }).promise
  } catch {
    throw new PdfExtractionError('invalid_pdf', 400)
  }

  let worker: Worker | undefined
  try {
    if (document.numPages > maximumPages) {
      throw new PdfExtractionError('pdf_page_limit_exceeded', 413)
    }

    const pages: { page: number; text: string }[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      pages.push({ page: pageNumber, text: await readPageText(page) })
    }

    const collectionDate = findCollectionDate(
      pages.map(({ text }) => text).join('\n'),
    )
    const ocrPages: number[] = []
    const measurements: ExtractedMeasurement[] = []

    for (const entry of pages) {
      const textMeasurements = parseMeasurementsFromText(
        entry.text,
        entry.page,
        0.9,
        collectionDate,
      )
      measurements.push(...textMeasurements)

      if (
        textMeasurements.length > 0 ||
        entry.text.length >= minimumPageTextLength
      ) {
        continue
      }

      try {
        worker ??= await createWorker('eng', undefined, {
          cachePath: join(tmpdir(), 'veyra-tesseract-cache'),
        })
        const page = await document.getPage(entry.page)
        const ocrText = await recognizePage(page, worker)
        const ocrMeasurements = parseMeasurementsFromText(
          ocrText,
          entry.page,
          0.65,
          collectionDate,
        )
        if (ocrMeasurements.length > 0) {
          ocrPages.push(entry.page)
          const existing = new Set(
            measurements.map(
              ({ normalizedName, value, page }) =>
                `${page}:${normalizedName}:${value}`,
            ),
          )
          measurements.push(
            ...ocrMeasurements.filter(
              ({ normalizedName, value, page }) =>
                !existing.has(`${page}:${normalizedName}:${value}`),
            ),
          )
        }
      } catch (error) {
        if (error instanceof PdfExtractionError) throw error
        console.error(`PDF OCR failed on page ${entry.page}:`, error)
        throw new PdfExtractionError('ocr_unavailable', 503)
      }
    }
    const qualityIssues: ExtractionQualityIssue[] = []
    if (measurements.length === 0) {
      qualityIssues.push({
        code: 'no_measurements_found',
        message:
          'No laboratory measurements could be confidently structured. Review the PDF or enter results manually.',
      })
    }
    for (const measurement of measurements) {
      if (!measurement.unit) {
        qualityIssues.push({
          code: 'missing_unit',
          message: `No unit was extracted for ${measurement.testName}.`,
          page: measurement.page,
        })
      }
      if (
        measurement.referenceLow === null &&
        measurement.referenceHigh === null &&
        !measurement.referenceRangeText
      ) {
        qualityIssues.push({
          code: 'missing_reference_range',
          message: `No reference range was extracted for ${measurement.testName}.`,
          page: measurement.page,
        })
      }
    }

    return {
      document: { pageCount: pages.length, ocrPages },
      measurements,
      qualityIssues,
    }
  } finally {
    if (worker) await worker.terminate()
    await document.destroy()
  }
}

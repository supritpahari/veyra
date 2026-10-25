export type MeasurementStatus = 'low' | 'in_range' | 'high' | 'needs_verification'
export type QualitySeverity = 'warning' | 'error'

export interface Measurement {
  id: string
  reportId: string
  testName: string
  normalizedName: string | null
  value: number
  unit: string | null
  referenceLow: number | null
  referenceHigh: number | null
  sourceText: string | null
  extractionConfidence: number | null
  collectedAt: string | null
}

export interface Report {
  id: string
  title: string
  sourceType: 'synthetic' | 'upload'
  createdAt: string
  measurements: Measurement[]
}

export interface QualityIssue {
  code: string
  severity: QualitySeverity
  message: string
  measurementIds: string[]
}

export interface AnalyzedMeasurement extends Measurement {
  status: MeasurementStatus
  evidence: {
    kind: 'reference_range'
    description: string
    method: 'deterministic'
  } | null
}

export interface Analysis {
  reportId: string
  sourceType: Report['sourceType']
  disclaimer: string
  measurements: AnalyzedMeasurement[]
  qualityIssues: QualityIssue[]
  relationships: []
  inferenceStatus: 'not_configured'
}

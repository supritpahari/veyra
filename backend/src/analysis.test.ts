import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeMeasurements } from './analysis.js'
import type { Measurement } from './types.js'

const makeMeasurement = (
  overrides: Partial<Measurement> = {},
): Measurement => ({
  id: 'measurement-1',
  reportId: 'report-1',
  testName: 'Synthetic Marker',
  normalizedName: 'synthetic_marker',
  value: 5,
  unit: 'units',
  referenceLow: 2,
  referenceHigh: 8,
  sourceText: 'Synthetic Marker 5 units (2-8)',
  extractionConfidence: 1,
  collectedAt: '2026-01-01',
  ...overrides,
})

test('marks values below and above supplied reference limits', () => {
  const analysis = analyzeMeasurements('report-1', 'synthetic', [
    makeMeasurement({ id: 'low', value: 1 }),
    makeMeasurement({ id: 'high', value: 9 }),
  ])

  assert.deepEqual(
    analysis.measurements.map(({ status }) => status),
    ['low', 'high'],
  )
  assert.equal(analysis.measurements[0]?.evidence?.method, 'deterministic')
})

test('does not infer a status when unit or reference range is missing', () => {
  const analysis = analyzeMeasurements('report-1', 'synthetic', [
    makeMeasurement({ unit: null }),
    makeMeasurement({
      id: 'no-range',
      normalizedName: 'no_range_marker',
      referenceLow: null,
      referenceHigh: null,
    }),
  ])

  assert.deepEqual(
    analysis.measurements.map(({ status }) => status),
    ['needs_verification', 'needs_verification'],
  )
  assert.equal(analysis.qualityIssues.length, 2)
})

test('flags duplicate normalized tests and invalid reference ranges', () => {
  const analysis = analyzeMeasurements('report-1', 'synthetic', [
    makeMeasurement({ id: 'first' }),
    makeMeasurement({
      id: 'second',
      value: 6,
      referenceLow: 10,
      referenceHigh: 2,
    }),
  ])

  assert.deepEqual(
    analysis.qualityIssues.map(({ code }) => code),
    [
      'invalid_reference_range',
      'duplicate_measurement',
      'conflicting_measurements',
    ],
  )
  assert.equal(analysis.measurements[1]?.status, 'needs_verification')
})

test('does not claim that relationship inference has been configured', () => {
  const analysis = analyzeMeasurements('report-1', 'synthetic', [
    makeMeasurement(),
  ])

  assert.deepEqual(analysis.relationships, [])
  assert.equal(analysis.inferenceStatus, 'not_configured')
})

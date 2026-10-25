import type {
  Analysis,
  AnalyzedMeasurement,
  Measurement,
  QualityIssue,
} from './types.js'

const disclaimer =
  'Veyra is a prototype for inspecting laboratory data, not a diagnostic system. Review results with a qualified healthcare professional.'

export function analyzeMeasurements(
  reportId: string,
  sourceType: 'synthetic' | 'upload',
  measurements: Measurement[],
): Analysis {
  const issues: QualityIssue[] = []
  const occurrences = new Map<string, string[]>()

  for (const measurement of measurements) {
    const normalizedName = measurement.normalizedName?.trim().toLowerCase()
    if (normalizedName) {
      const ids = occurrences.get(normalizedName) ?? []
      ids.push(measurement.id)
      occurrences.set(normalizedName, ids)
    }

    if (!measurement.unit?.trim()) {
      issues.push({
        code: 'missing_unit',
        severity: 'warning',
        message: `${measurement.testName} has no unit and needs verification.`,
        measurementIds: [measurement.id],
      })
    }

    if (
      measurement.referenceLow === null &&
      measurement.referenceHigh === null
    ) {
      issues.push({
        code: 'missing_reference_range',
        severity: 'warning',
        message: `${measurement.testName} has no supplied reference limit.`,
        measurementIds: [measurement.id],
      })
    } else if (
      measurement.referenceLow !== null &&
      measurement.referenceHigh !== null &&
      measurement.referenceLow > measurement.referenceHigh
    ) {
      issues.push({
        code: 'invalid_reference_range',
        severity: 'error',
        message: `${measurement.testName} has a lower reference limit above its upper limit.`,
        measurementIds: [measurement.id],
      })
    }

    if (
      measurement.extractionConfidence !== null &&
      measurement.extractionConfidence < 0.8
    ) {
      issues.push({
        code: 'low_extraction_confidence',
        severity: 'warning',
        message: `${measurement.testName} has low extraction confidence and needs verification.`,
        measurementIds: [measurement.id],
      })
    }
  }

  for (const [normalizedName, ids] of occurrences) {
    if (ids.length > 1) {
      issues.push({
        code: 'duplicate_measurement',
        severity: 'warning',
        message: `Multiple measurements share the normalized name "${normalizedName}".`,
        measurementIds: ids,
      })

      const duplicates = measurements.filter(
        (measurement) =>
          measurement.normalizedName?.trim().toLowerCase() === normalizedName,
      )
      const first = duplicates[0]!
      if (
        duplicates.some(
          (measurement) =>
            measurement.value !== first.value || measurement.unit !== first.unit,
        )
      ) {
        issues.push({
          code: 'conflicting_measurements',
          severity: 'error',
          message: `Measurements named "${normalizedName}" have conflicting values or units.`,
          measurementIds: ids,
        })
      }
    }
  }

  const analyzed: AnalyzedMeasurement[] = measurements.map((measurement) => {
    const hasRange =
      measurement.referenceLow !== null || measurement.referenceHigh !== null
    const rangeIsInvalid =
      measurement.referenceLow !== null &&
      measurement.referenceHigh !== null &&
      measurement.referenceLow > measurement.referenceHigh
    const needsVerification =
      !measurement.unit?.trim() ||
      !hasRange ||
      rangeIsInvalid ||
      (measurement.extractionConfidence !== null &&
        measurement.extractionConfidence < 0.8)

    let status: AnalyzedMeasurement['status'] = 'needs_verification'
    if (!needsVerification) {
      const belowLow =
        measurement.referenceLow !== null &&
        measurement.value < measurement.referenceLow
      const aboveHigh =
        measurement.referenceHigh !== null &&
        measurement.value > measurement.referenceHigh

      status = belowLow ? 'low' : aboveHigh ? 'high' : 'in_range'
    }

    const hasUsableRange = hasRange && !rangeIsInvalid
    const rangeText = [
      measurement.referenceLow === null
        ? null
        : `lower limit ${measurement.referenceLow}`,
      measurement.referenceHigh === null
        ? null
        : `upper limit ${measurement.referenceHigh}`,
    ]
      .filter(Boolean)
      .join(' and ')

    return {
      ...measurement,
      status,
      evidence:
        hasUsableRange && !needsVerification
          ? {
              kind: 'reference_range',
              description: `Compared ${measurement.value} ${measurement.unit} with the supplied ${rangeText}.`,
              method: 'deterministic',
            }
          : null,
    }
  })

  return {
    reportId,
    sourceType,
    disclaimer,
    measurements: analyzed,
    qualityIssues: issues,
    relationships: [],
    inferenceStatus: 'not_configured',
  }
}

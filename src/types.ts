export type FlagType = 'low' | 'high' | 'normal' | 'verify' | 'conflict' | 'in_range' | 'needs_verification';

export type KindType =
  | 'observed'
  | 'associated'
  | 'inferred'
  | 'deterministic'
  | 'model'
  | 'unverified'
  | 'reference_range';

export interface ApiMeasurement {
  id: string;
  reportId: string;
  testName: string;
  normalizedName: string;
  value: number | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  sourceText: string;
  extractionConfidence: number;
  collectedAt: string;
  status: 'low' | 'in_range' | 'high' | 'needs_verification';
  evidence?: {
    kind: string;
    description: string;
    method: string;
  } | null;
}

export interface ApiQualityIssue {
  code:
    | 'missing_unit'
    | 'missing_reference_range'
    | 'invalid_reference_range'
    | 'low_extraction_confidence'
    | 'duplicate_measurement'
    | 'conflicting_measurements'
    | string;
  severity: 'warning' | 'error' | string;
  message: string;
  measurementIds: string[];
}

export interface ApiReportListItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
}

export interface ApiReportAnalysis {
  reportId: string;
  sourceType: string;
  disclaimer: string;
  measurements: ApiMeasurement[];
  qualityIssues: ApiQualityIssue[];
  relationships: any[];
  inferenceStatus: string;
}

export interface ApiSimulationResult {
  persisted: boolean;
  disclaimer: string;
  changedMeasurement: {
    measurementId: string;
    originalValue: number;
    simulatedValue: number;
    originalStatus: string;
    simulatedStatus: string;
    statusChanged: boolean;
  };
  originalAnalysis: ApiReportAnalysis;
  simulatedAnalysis: ApiReportAnalysis;
}

export interface Measurement {
  id: string;
  name: string;
  short?: string;
  raw: string;
  panel: string;
  value: number | null;
  unit: string | null;
  range: { low: number | null; high: number | null } | null;
  rangeUnit?: string;
  conf: 'high' | 'low' | 'unreadable';
  line: number;
  src: string;
  pos: [number, number];
  sim?: [number, number, number] | null;
  dupOf?: string | null;
  hidden?: boolean;
  note?: string;
  status?: FlagType;
  evidence?: {
    kind: string;
    description: string;
    method: string;
  } | null;
}

export interface Edge {
  id: string;
  a: string;
  b: string;
  kind: 'associated' | 'inferred';
  rule: string;
  title: string;
  when: (flags: Record<string, FlagType>) => boolean;
  why: string;
  notWhen: string;
}

export interface Report {
  id: string;
  title: string;
  subtitle?: string;
  patient: string;
  collected: string;
  lab: string;
  source: string;
  measurements: Measurement[];
  edges: Edge[];
  sourceType?: string;
}

export interface FlagMetaItem {
  label: string;
  short: string;
  glyph: string;
  tone: 'alert' | 'danger' | 'ok' | 'verify';
}

export interface Analysis {
  flags: Record<string, FlagType>;
  active: Record<string, boolean>;
}

export interface IntegrityIssue {
  id: string;
  mid: string;
  sev: 'block' | 'warn';
  type: string;
  title: string;
  detail: string;
  fix: string;
}

export type ThemeType = 'clinical' | 'paper' | 'dark';
export type FontType = 'plex' | 'geist' | 'serif';

export interface TweaksState {
  theme: ThemeType;
  font: FontType;
  accent: string;
}

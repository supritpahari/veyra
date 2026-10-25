export type FlagType = 'low' | 'high' | 'normal' | 'verify' | 'conflict';

export type KindType =
  | 'observed'
  | 'associated'
  | 'inferred'
  | 'deterministic'
  | 'model'
  | 'unverified';

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
  subtitle: string;
  patient: string;
  collected: string;
  lab: string;
  source: string;
  measurements: Measurement[];
  edges: Edge[];
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

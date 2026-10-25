import type { Report, Measurement, Analysis, IntegrityIssue, FlagMetaItem, FlagType } from '../types';

export function vhFmtRange(r: { low: number | null; high: number | null } | null): string {
  if (!r) return '—';
  if (r.low != null && r.high != null) return `${r.low} – ${r.high}`;
  if (r.high != null) return `< ${r.high}`;
  if (r.low != null) return `> ${r.low}`;
  return '—';
}

export function vhFlag(m: Measurement, report: Report): FlagType {
  if (m.conf === 'unreadable' || m.value == null) return 'verify';
  const dups = report.measurements.filter(
    x => (x.dupOf === m.id || m.dupOf === x.id || (m.dupOf && x.dupOf === m.dupOf)) && x.id !== m.id
  );
  if (dups.some(d => d.value !== m.value)) return 'conflict';
  if (!m.unit || !m.range || m.conf === 'low' || (m.rangeUnit && m.rangeUnit !== m.unit)) return 'verify';
  const { low, high } = m.range;
  if (low != null && m.value < low) return 'low';
  if (high != null && m.value > high) return 'high';
  return 'normal';
}

export function vhVerifyReason(m: Measurement, report: Report): string | null {
  if (m.conf === 'unreadable' || m.value == null) return 'Value unreadable';
  const f = vhFlag(m, report);
  if (f === 'conflict') return 'Conflicting duplicate';
  if (!m.unit) return 'Unit missing';
  if (!m.range) return 'Reference range missing';
  if (m.rangeUnit && m.rangeUnit !== m.unit) return 'Unit mismatch';
  if (m.conf === 'low') return 'Low-confidence extraction';
  return null;
}

export function vhAnalyze(report: Report): Analysis {
  const flags: Record<string, FlagType> = {};
  report.measurements.forEach(m => {
    flags[m.id] = vhFlag(m, report);
  });
  const active: Record<string, boolean> = {};
  report.edges.forEach(e => {
    active[e.id] = !!e.when(flags);
  });
  return { flags, active };
}

export function vhIntegrity(report: Report): IntegrityIssue[] {
  const out: IntegrityIssue[] = [];
  report.measurements.forEach(m => {
    if (m.conf === 'unreadable') {
      out.push({
        id: m.id + '-unread',
        mid: m.id,
        sev: 'block',
        type: 'Unreadable text',
        title: `${m.name}: value could not be read`,
        detail: m.note || 'The value region could not be parsed.',
        fix: 'Re-scan or re-photograph the report, or enter the value manually from the original document. The test is excluded from interpretation until resolved.',
      });
    }
    if (m.value != null && !m.unit) {
      out.push({
        id: m.id + '-unit',
        mid: m.id,
        sev: 'warn',
        type: 'Missing unit',
        title: `${m.name}: no unit printed`,
        detail: `Value ${m.value} was extracted without a unit. Veyra does not infer units, because the same number can mean different things in pg/mL and pmol/L.`,
        fix: 'Confirm the unit with the issuing laboratory, then enter it. The value stays flagged "Needs verification" until then.',
      });
    }
    if (!m.range && m.conf !== 'unreadable') {
      out.push({
        id: m.id + '-range',
        mid: m.id,
        sev: 'warn',
        type: 'Missing reference range',
        title: `${m.name}: no reference interval on report`,
        detail: 'The report gives no reference interval for this test. Veyra does not substitute a generic population range.',
        fix: 'Add the interval from the lab’s published reference sheet, citing the source. Until then the result shows "Insufficient information".',
      });
    }
    if (m.conf === 'low') {
      out.push({
        id: m.id + '-conf',
        mid: m.id,
        sev: 'warn',
        type: 'Low-confidence extraction',
        title: `${m.name}: uncertain characters`,
        detail: m.note || 'The OCR output contains uncertain characters.',
        fix: 'Compare against the original document and confirm the value.',
      });
    }
    if (m.rangeUnit && m.rangeUnit !== m.unit) {
      out.push({
        id: m.id + '-conv',
        mid: m.id,
        sev: 'warn',
        type: 'Unsupported conversion',
        title: `${m.name}: value in ${m.unit}, range in ${m.rangeUnit}`,
        detail: `The value and the reference interval use different units. Veyra converts only between pairs on its verified conversion list, and ${m.unit} → ${m.rangeUnit} is not on that list for this test.`,
        fix: 'Obtain the interval in the same unit as the value, or have a reviewer confirm a conversion factor and record it.',
      });
    }
    if (m.dupOf) {
      const o = report.measurements.find(x => x.id === m.dupOf);
      if (o && o.value !== m.value) {
        out.push({
          id: m.id + '-dup',
          mid: o.id,
          sev: 'block',
          type: 'Conflicting duplicate',
          title: `${m.name} reported twice with different values`,
          detail: `Line ${o.line}: ${o.value} ${o.unit}. Line ${m.line}: ${m.value} ${m.unit}. Both lines have the same draw date, and the report does not say which one is final.`,
          fix: 'Ask the lab which result is authoritative (for example a repeat test or a corrected result). Both are kept, and neither is interpreted.',
        });
      }
    }
  });
  return out;
}

export const VH_FLAG_META: Record<FlagType, FlagMetaItem> = {
  low: { label: 'Below range', short: 'Low', glyph: '↓', tone: 'alert' },
  high: { label: 'Above range', short: 'High', glyph: '↑', tone: 'alert' },
  normal: { label: 'Within range', short: 'In range', glyph: '✓', tone: 'ok' },
  in_range: { label: 'Within range', short: 'In range', glyph: '✓', tone: 'ok' },
  verify: { label: 'Needs verification', short: 'Verify', glyph: '?', tone: 'verify' },
  needs_verification: { label: 'Needs verification', short: 'Verify', glyph: '?', tone: 'verify' },
  conflict: { label: 'Conflicting values', short: 'Conflict', glyph: '!', tone: 'danger' },
};

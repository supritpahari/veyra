import type { Report, Measurement, Analysis, IntegrityIssue, FlagMetaItem, FlagType } from '../types';

export const VH_RULESET = 'Configured rule set v0.1 (demo · pending clinical review)';

export const VH_REPORTS: Report[] = [
  {
    id: 'SYN-0042',
    title: 'Synthetic case A',
    subtitle: 'CBC · Iron studies · Metabolic · Lipid · Thyroid',
    patient: 'Synthetic subject · F · 34',
    collected: '2026-09-14',
    lab: 'Northgate Diagnostics (fictional)',
    source: 'synthetic_report_A.pdf · 2 pages',
    measurements: [
      { id: 'hgb', name: 'Hemoglobin', raw: 'HGB', panel: 'CBC', value: 10.8, unit: 'g/dL', range: { low: 12.0, high: 15.5 }, conf: 'high', line: 14, src: 'HGB            10.8   g/dL     12.0 - 15.5   L', pos: [210, 120], sim: [6, 18, 0.1] },
      { id: 'mcv', name: 'Mean corpuscular volume', short: 'MCV', raw: 'MCV', panel: 'CBC', value: 74, unit: 'fL', range: { low: 80, high: 100 }, conf: 'high', line: 15, src: 'MCV            74     fL       80 - 100      L', pos: [95, 225], sim: [60, 115, 1] },
      { id: 'rbc', name: 'Red blood cells', short: 'RBC', raw: 'RBC', panel: 'CBC', value: 4.3, unit: '×10⁶/µL', range: { low: 3.9, high: 5.1 }, conf: 'high', line: 13, src: 'RBC            4.30   x10^6/uL 3.90 - 5.10', pos: [95, 70], sim: [2.5, 6.5, 0.05] },
      { id: 'wbc', name: 'White blood cells', short: 'WBC', raw: 'WBC', panel: 'CBC', value: 6.2, unit: '×10³/µL', range: { low: 4.0, high: 11.0 }, conf: 'high', line: 12, src: 'WBC            6.2    x10^3/uL 4.0 - 11.0', pos: [95, 370], sim: [1, 20, 0.1] },
      { id: 'plt', name: 'Platelets', short: 'PLT', raw: 'PLT', panel: 'CBC', value: 412, unit: '×10³/µL', range: { low: 150, high: 400 }, conf: 'high', line: 16, src: 'PLT            412    x10^3/uL 150 - 400     H', pos: [250, 315], sim: [80, 600, 1] },
      { id: 'ferr', name: 'Ferritin', raw: 'FERRITIN', panel: 'Iron studies', value: 8, unit: 'ng/mL', range: { low: 15, high: 150 }, conf: 'high', line: 22, src: 'FERRITIN       8      ng/mL    15 - 150      L', pos: [420, 215], sim: [2, 300, 1] },
      { id: 'iron', name: 'Serum iron', raw: 'IRON, SERUM', panel: 'Iron studies', value: 38, unit: 'µg/dL', range: { low: 50, high: 170 }, conf: 'high', line: 23, src: 'IRON, SERUM    38     ug/dL    50 - 170      L', pos: [420, 75], sim: [10, 250, 1] },
      { id: 'tibc', name: 'Total iron-binding capacity', short: 'TIBC', raw: 'TIBC', panel: 'Iron studies', value: 462, unit: 'µg/dL', range: { low: 250, high: 450 }, conf: 'high', line: 24, src: 'TIBC           462    ug/dL    250 - 450     H', pos: [595, 140], sim: [150, 600, 1] },
      { id: 'b12', name: 'Vitamin B12', raw: 'VIT B12', panel: 'Iron studies', value: 410, unit: null, range: { low: 200, high: 900 }, conf: 'high', line: 25, src: 'VIT B12        410             200 - 900', pos: [595, 290], sim: null },
      { id: 'glu', name: 'Glucose, fasting', raw: 'GLUCOSE FAST', panel: 'Metabolic', value: 104, unit: 'mg/dL', range: { low: 70, high: 99 }, conf: 'high', line: 31, src: 'GLUCOSE FAST   104    mg/dL    70 - 99       H', pos: [440, 420], sim: [40, 300, 1] },
      { id: 'a1c', name: 'Hemoglobin A1c', short: 'HbA1c', raw: 'HBA1C', panel: 'Metabolic', value: 5.9, unit: '%', range: { low: 4.0, high: 5.6 }, conf: 'high', line: 32, src: 'HBA1C          5.9    %        4.0 - 5.6     H', pos: [600, 470], sim: [4, 12, 0.1] },
      { id: 'cre', name: 'Creatinine', raw: 'CREAT', panel: 'Metabolic', value: 0.9, unit: 'mg/dL', range: { low: 0.6, high: 1.1 }, conf: 'low', line: 33, src: 'CREAT          0.9?   mg/dL    0.6 - 1.1', note: 'Glyph after value partially obscured by a scan artifact; may read 0.9 or 0.8.', pos: [255, 470], sim: [0.3, 4, 0.05] },
      { id: 'k', name: 'Potassium', raw: 'K', panel: 'Metabolic', value: 4.2, unit: 'mmol/L', range: { low: 3.5, high: 5.1 }, conf: 'high', line: 34, dupOf: null, src: 'K              4.2    mmol/L   3.5 - 5.1', pos: [700, 330], sim: [2.5, 7, 0.1] },
      { id: 'k2', name: 'Potassium', raw: 'K', panel: 'Metabolic', value: 5.9, unit: 'mmol/L', range: { low: 3.5, high: 5.1 }, conf: 'high', line: 41, dupOf: 'k', pos: [700, 330], src: 'K              5.9    mmol/L   3.5 - 5.1     H', hidden: true, sim: null },
      { id: 'tsh', name: 'Thyroid-stimulating hormone', short: 'TSH', raw: 'TSH', panel: 'Thyroid', value: 2.1, unit: 'mIU/L', range: null, conf: 'high', line: 38, src: 'TSH            2.10   mIU/L', pos: [700, 40], sim: null },
      { id: 'ldl', name: 'LDL cholesterol', short: 'LDL-C', raw: 'LDL CALC', panel: 'Lipid', value: 142, unit: 'mg/dL', range: { low: null, high: 100 }, conf: 'high', line: 36, src: 'LDL CALC       142    mg/dL    <100          H', pos: [95, 485], sim: [40, 250, 1] },
    ],
    edges: [
      { id: 'e1', a: 'hgb', b: 'mcv', kind: 'associated', rule: 'R-CBC-01', title: 'Low hemoglobin with low MCV', when: f => f.hgb === 'low' && f.mcv === 'low', why: 'Both values are below their stated reference intervals on the same draw. The configured rule groups them as a microcytic pattern that is commonly reviewed alongside iron studies.', notWhen: 'Requires hemoglobin AND MCV below range.' },
      { id: 'e2', a: 'ferr', b: 'iron', kind: 'associated', rule: 'R-FE-01', title: 'Iron studies pattern', when: f => f.ferr === 'low' && f.iron === 'low', why: 'Ferritin and serum iron are both below range. The rule links them as components of the same iron-studies pattern.', notWhen: 'Requires ferritin AND serum iron below range.' },
      { id: 'e3', a: 'iron', b: 'tibc', kind: 'associated', rule: 'R-FE-02', title: 'Low iron with high TIBC', when: f => f.iron === 'low' && f.tibc === 'high', why: 'Serum iron below range with TIBC above range. The rule shows these as a paired iron-studies finding.', notWhen: 'Requires serum iron below AND TIBC above range.' },
      { id: 'e4', a: 'ferr', b: 'hgb', kind: 'associated', rule: 'R-FE-03', title: 'Low ferritin alongside low hemoglobin', when: f => f.ferr === 'low' && f.hgb === 'low', why: 'Ferritin and hemoglobin are both below range. The rule connects the iron-studies cluster to the CBC cluster for review.', notWhen: 'Requires ferritin AND hemoglobin below range.' },
      { id: 'e5', a: 'glu', b: 'a1c', kind: 'associated', rule: 'R-GLY-01', title: 'Glycemic markers', when: f => f.glu === 'high' || f.a1c === 'high', why: 'Fasting glucose and HbA1c are both glycemic markers. The rule links them whenever either is above range so they are reviewed together.', notWhen: 'Requires glucose OR HbA1c above range.' },
      { id: 'e6', a: 'plt', b: 'ferr', kind: 'inferred', rule: 'BASELINE-H-07', title: 'Elevated platelets with low ferritin', when: f => f.plt === 'high' && f.ferr === 'low', why: 'Suggested pattern only. The baseline heuristic surfaces platelets above range co-occurring with low ferritin. No trained model is connected; this suggestion has not been evaluated.', notWhen: 'Heuristic fires when platelets above range AND ferritin below range.' },
    ],
  },
  {
    id: 'SYN-0107',
    title: 'Synthetic case B',
    subtitle: 'Metabolic · Renal · Lipid',
    patient: 'Synthetic subject · M · 61',
    collected: '2026-10-02',
    lab: 'Harbor Clinical Lab (fictional)',
    source: 'synthetic_report_B.jpg · photo of printout',
    measurements: [
      { id: 'glu', name: 'Glucose, fasting', raw: 'GLU (F)', panel: 'Metabolic', value: 132, unit: 'mg/dL', range: { low: 70, high: 99 }, conf: 'high', line: 8, src: 'GLU (F)     132   mg/dL   70-99     H', pos: [130, 90], sim: [40, 300, 1] },
      { id: 'a1c', name: 'Hemoglobin A1c', short: 'HbA1c', raw: 'A1C', panel: 'Metabolic', value: 6.8, unit: '%', range: { low: 4.0, high: 5.6 }, conf: 'high', line: 9, src: 'A1C         6.8   %       4.0-5.6   H', pos: [130, 240], sim: [4, 12, 0.1] },
      { id: 'cre', name: 'Creatinine', raw: 'CREA', panel: 'Renal', value: 1.6, unit: 'mg/dL', range: { low: 0.7, high: 1.3 }, conf: 'high', line: 11, src: 'CREA        1.6   mg/dL   0.7-1.3   H', pos: [420, 130], sim: [0.3, 4, 0.05] },
      { id: 'egfr', name: 'eGFR', raw: 'eGFR', panel: 'Renal', value: 44, unit: 'mL/min/1.73m²', range: { low: 60, high: null }, conf: 'high', line: 12, src: 'eGFR        44    mL/min/1.73m2  >60  L', pos: [420, 290], sim: [5, 120, 1] },
      { id: 'bun', name: 'Urea nitrogen', short: 'BUN', raw: 'BUN', panel: 'Renal', value: 28, unit: 'mg/dL', range: { low: 7, high: 20 }, conf: 'high', line: 10, src: 'BUN         28    mg/dL   7-20      H', pos: [600, 60], sim: [3, 80, 1] },
      { id: 'k', name: 'Potassium', raw: 'K+', panel: 'Renal', value: 5.3, unit: 'mmol/L', range: { low: 3.5, high: 5.1 }, conf: 'high', line: 14, src: 'K+          5.3   mmol/L  3.5-5.1   H', pos: [620, 250], sim: [2.5, 7, 0.1] },
      { id: 'na', name: 'Sodium', raw: 'NA+', panel: 'Renal', value: 139, unit: 'mmol/L', range: { low: 136, high: 145 }, conf: 'high', line: 13, src: 'NA+         139   mmol/L  136-145', pos: [700, 400], sim: [120, 160, 1] },
      { id: 'uacr', name: 'Urine albumin/creatinine', short: 'UACR', raw: 'UACR', panel: 'Renal', value: 48, unit: 'mg/mmol', range: { low: null, high: 30 }, rangeUnit: 'mg/g', conf: 'high', line: 16, src: 'UACR        48    mg/mmol  <30 mg/g', pos: [560, 480], sim: null },
      { id: 'hdl', name: 'HDL cholesterol', short: 'HDL-C', raw: 'HDL', panel: 'Lipid', value: 38, unit: 'mg/dL', range: { low: 40, high: null }, conf: 'high', line: 19, src: 'HDL         38    mg/dL   >40       L', pos: [130, 400], sim: [15, 100, 1] },
      { id: 'tg', name: 'Triglycerides', raw: 'TRIG', panel: 'Lipid', value: 210, unit: 'mg/dL', range: { low: null, high: 150 }, conf: 'high', line: 20, src: 'TRIG        210   mg/dL   <150      H', pos: [320, 470], sim: [40, 600, 1] },
      { id: 'alt', name: 'Alanine aminotransferase', short: 'ALT', raw: 'ALT', panel: 'Liver', value: null, unit: 'U/L', range: { low: 7, high: 56 }, conf: 'unreadable', line: 22, src: 'ALT         ▒▒    U/L     7-56', note: 'Value region is blurred in the photo; no digits recoverable.', pos: [740, 140], sim: null },
    ],
    edges: [
      { id: 'b1', a: 'glu', b: 'a1c', kind: 'associated', rule: 'R-GLY-01', title: 'Glycemic markers', when: f => f.glu === 'high' || f.a1c === 'high', why: 'Fasting glucose and HbA1c are both glycemic markers. The rule links them whenever either is above range.', notWhen: 'Requires glucose OR HbA1c above range.' },
      { id: 'b2', a: 'cre', b: 'egfr', kind: 'associated', rule: 'R-REN-01', title: 'eGFR derives from creatinine', when: () => true, why: 'eGFR is calculated from serum creatinine (plus age and sex). This is a structural link, shown regardless of flags.', notWhen: 'Always shown.' },
      { id: 'b3', a: 'cre', b: 'bun', kind: 'associated', rule: 'R-REN-02', title: 'Renal function markers', when: f => f.cre === 'high' && f.bun === 'high', why: 'Creatinine and BUN are both above range. The rule groups them as renal function markers for review.', notWhen: 'Requires creatinine AND BUN above range.' },
      { id: 'b4', a: 'egfr', b: 'k', kind: 'associated', rule: 'R-REN-03', title: 'Reduced eGFR with high potassium', when: f => f.egfr === 'low' && f.k === 'high', why: 'eGFR below range together with potassium above range. The rule surfaces this pair so they are reviewed together.', notWhen: 'Requires eGFR below AND potassium above range.' },
      { id: 'b5', a: 'tg', b: 'hdl', kind: 'associated', rule: 'R-LIP-01', title: 'High triglycerides with low HDL', when: f => f.tg === 'high' && f.hdl === 'low', why: 'Triglycerides above range and HDL below range. The rule pairs them as a lipid pattern.', notWhen: 'Requires triglycerides above AND HDL below range.' },
      { id: 'b6', a: 'a1c', b: 'egfr', kind: 'inferred', rule: 'BASELINE-H-12', title: 'Elevated HbA1c with reduced eGFR', when: f => f.a1c === 'high' && f.egfr === 'low', why: 'Suggested pattern only. The baseline heuristic surfaces co-occurrence of HbA1c above range and eGFR below range. Not evaluated; no trained model connected.', notWhen: 'Heuristic fires when HbA1c above AND eGFR below range.' },
    ],
  },
];

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
  verify: { label: 'Needs verification', short: 'Verify', glyph: '?', tone: 'verify' },
  conflict: { label: 'Conflicting values', short: 'Conflict', glyph: '!', tone: 'danger' },
};

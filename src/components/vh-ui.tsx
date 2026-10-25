import React from 'react';
import type { FlagType, KindType, Measurement, Report } from '../types';
import { VH_FLAG_META, vhFmtRange } from '../data/vh-data';
import { useVeyra } from '../context/VeyraContext';

export function Logo() {
  return (
    <svg className="vh-logo__m" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="var(--ink)" />
      <path
        d="M13.75 11 L22.18 31.56"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25.82 31.56 L34.25 11"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="36" r="3.2" fill="var(--accent)" />
    </svg>
  );
}

export function FlagBadge({ flag, size = 'md' }: { flag: FlagType | string; size?: 'sm' | 'md' }) {
  const m = VH_FLAG_META[flag as FlagType] || VH_FLAG_META.verify;
  return (
    <span className={`vh-flag vh-flag--${m.tone} vh-flag--${size}`}>
      <span className="vh-flag__g" aria-hidden="true">{m.glyph}</span>
      {size === 'sm' ? m.short : m.label}
    </span>
  );
}

export function KindTag({ kind }: { kind: KindType | string }) {
  const map: Record<string, [string, string]> = {
    observed: ['Observed', 'Extracted directly from the report'],
    associated: ['Associated', 'Linked by configured rule'],
    inferred: ['Inferred', 'Suggested pattern; not verified'],
    deterministic: ['Deterministic', 'Rule-based logic'],
    reference_range: ['Reference Range', 'Deterministic interval comparison'],
    model: ['Model', 'Machine-learning output'],
    unverified: ['Unverified', 'Cannot be verified from evidence'],
  };
  const [l, t] = map[kind] || [kind, ''];
  return (
    <span className={`vh-kind vh-kind--${kind}`} title={t}>
      <i />{l}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="vh-eyebrow">{children}</div>;
}

export function SynthBanner({ children }: { children?: React.ReactNode }) {
  const { apiAnalysis, isBackendConnected } = useVeyra();
  return (
    <div className="vh-synth">
      <span className="vh-synth__tag">
        {apiAnalysis?.sourceType?.toUpperCase() || 'SYNTHETIC'} DATA
      </span>
      <span>
        {children ||
          apiAnalysis?.disclaimer ||
          'Veyra is a prototype for inspecting laboratory data, not a diagnostic system. Review results with a qualified healthcare professional.'}
      </span>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isBackendConnected ? 'var(--ok)' : 'var(--amber)',
          }}
        />
        {isBackendConnected ? 'API Connected' : 'Offline Mode'}
      </span>
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  lede,
  right,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="vh-pagehead">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="vh-h1">{title}</h1>
        {lede && <p className="vh-lede">{lede}</p>}
      </div>
      {right && <div className="vh-pagehead__r">{right}</div>}
    </div>
  );
}

export function ReportPicker({
  reportId,
  setReportId,
}: {
  reportId: string;
  setReportId: (id: string) => void;
}) {
  const { availableReports } = useVeyra();

  return (
    <div className="vh-seg" role="tablist">
      {availableReports.map((r, i) => (
        <button
          key={r.id}
          role="tab"
          aria-selected={r.id === reportId}
          className={r.id === reportId ? 'on' : ''}
          onClick={() => setReportId(r.id)}
          title={r.title}
        >
          <span className="mono">Sample {String.fromCharCode(65 + i)}</span>
        </button>
      ))}
    </div>
  );
}

export function fmtVal(m: Measurement): string {
  if (m.value == null) return '—';
  return String(m.value);
}

export function MeasurementReceipt({
  m,
  report,
  flag,
}: {
  m: Measurement;
  report: Report;
  flag: FlagType;
}) {
  return (
    <div className="vh-receipt">
      <div className="vh-receipt__head">
        <div>
          <div className="vh-receipt__name">{m.name}</div>
          <div className="vh-receipt__sub mono">{m.panel} {m.raw ? `· ${m.raw}` : ''}</div>
        </div>
        <FlagBadge flag={flag} />
      </div>

      <div className="vh-receipt__src">
        <div className="vh-receipt__lbl">Source text · {report.source}</div>
        <pre className="mono">{m.src || `${m.name}: ${m.value} ${m.unit || ''}`}</pre>
      </div>

      <dl className="vh-dl">
        <dt>Value</dt>
        <dd className="mono">{fmtVal(m)}</dd>
        <dt>Unit</dt>
        <dd className="mono">{m.unit || <em className="vh-missing">not printed</em>}</dd>
        <dt>Reference</dt>
        <dd className="mono">
          {m.range ? `${vhFmtRange(m.range)} ${m.rangeUnit || m.unit || ''}` : <em className="vh-missing">not on report</em>}
        </dd>
        <dt>Extraction</dt>
        <dd>{m.conf === 'high' ? 'Clean extraction (1.0)' : 'Verification needed (<0.8)'}</dd>
        <dt>Method</dt>
        <dd>
          <KindTag kind={m.evidence?.method || 'deterministic'} />
        </dd>
      </dl>

      {m.evidence?.description && (
        <div className="vh-receipt__evidence" style={{ marginTop: 12, fontSize: 13, color: 'var(--ink2)' }}>
          <strong>Evidence detail:</strong> {m.evidence.description}
        </div>
      )}

      {m.note && (
        <div className="vh-receipt__warn">
          <strong>Note.</strong> {m.note}
        </div>
      )}
    </div>
  );
}

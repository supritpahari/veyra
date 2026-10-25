import React from 'react';
import type { FlagType, KindType, Measurement, Report } from '../types';
import { VH_FLAG_META, vhFmtRange, vhVerifyReason, VH_REPORTS } from '../data/vh-data';

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

export function FlagBadge({ flag, size = 'md' }: { flag: FlagType; size?: 'sm' | 'md' }) {
  const m = VH_FLAG_META[flag] || VH_FLAG_META.verify;
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
  return (
    <div className="vh-synth">
      <span className="vh-synth__tag">SYNTHETIC DATA</span>
      <span>{children || 'Prototype for review by qualified professionals. Not a diagnostic system.'}</span>
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
  return (
    <div className="vh-seg" role="tablist">
      {VH_REPORTS.map(r => (
        <button
          key={r.id}
          role="tab"
          aria-selected={r.id === reportId}
          className={r.id === reportId ? 'on' : ''}
          onClick={() => setReportId(r.id)}
        >
          <span className="mono">{r.id}</span>
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
  const reason = vhVerifyReason(m, report);
  return (
    <div className="vh-receipt">
      <div className="vh-receipt__head">
        <div>
          <div className="vh-receipt__name">{m.name}</div>
          <div className="vh-receipt__sub mono">{m.panel} · line {m.line}</div>
        </div>
        <FlagBadge flag={flag} />
      </div>
      <div className="vh-receipt__src">
        <div className="vh-receipt__lbl">Source text · {report.source.split(' · ')[0]}</div>
        <pre className="mono">{m.src}</pre>
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
        <dt>Range source</dt>
        <dd>{m.range ? 'Printed on report' : '—'}</dd>
        <dt>Extraction</dt>
        <dd>{m.conf === 'high' ? 'Clean parse' : m.conf === 'low' ? 'Low confidence' : 'Unreadable'}</dd>
        <dt>Logic</dt>
        <dd><KindTag kind="deterministic" /></dd>
      </dl>
      {(reason || m.note) && (
        <div className="vh-receipt__warn">
          <strong>{reason || 'Note'}.</strong> {m.note || 'Veyra will not guess. This result is held for human verification.'}
        </div>
      )}
    </div>
  );
}

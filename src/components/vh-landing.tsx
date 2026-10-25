import { useState } from 'react';
import { VH_REPORTS, vhAnalyze, vhFmtRange, vhVerifyReason } from '../data/vh-data';
import { Eyebrow, FlagBadge, KindTag, fmtVal } from './vh-ui';

export function HeroSpecimen({ go }: { go: (route: string) => void }) {
  const r = VH_REPORTS[0];
  const { flags } = vhAnalyze(r);
  const rows = ['hgb', 'mcv', 'ferr', 'iron', 'tibc', 'b12', 'tsh']
    .map(id => r.measurements.find(m => m.id === id))
    .filter(Boolean) as typeof r.measurements;
  const [sel, setSel] = useState('ferr');
  const m = rows.find(x => x.id === sel) || rows[0];

  return (
    <div className="vh-spec">
      <div className="vh-spec__bar">
        <span className="mono">{r.id}</span>
        <span>·</span>
        <span>{r.source}</span>
        <span className="vh-spec__live">
          <i />Live demo
        </span>
      </div>
      <div className="vh-spec__body">
        <table className="vh-spec__tbl">
          <tbody>
            {rows.map(x => (
              <tr
                key={x.id}
                className={x.id === sel ? 'on' : ''}
                onClick={() => setSel(x.id)}
              >
                <td>{x.short || x.name}</td>
                <td className="mono num">{fmtVal(x)}</td>
                <td className="mono dim">{x.unit || '—'}</td>
                <td>
                  <FlagBadge flag={flags[x.id]} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="vh-spec__rcpt">
          <div className="vh-receipt__lbl">Evidence receipt</div>
          <div className="vh-spec__name">{m.name}</div>
          <pre className="mono">{m.src}</pre>
          <div className="vh-spec__kv">
            <span>Reference</span>
            <b className="mono">{m.range ? vhFmtRange(m.range) : 'not on report'}</b>
            <span>Flag source</span>
            <b>
              <KindTag kind="deterministic" />
            </b>
          </div>
          {vhVerifyReason(m, r) && (
            <div className="vh-receipt__warn">
              <strong>{vhVerifyReason(m, r)}.</strong> Held for review, not guessed.
            </div>
          )}
        </div>
      </div>
      <button className="vh-spec__cta" onClick={() => go('analyzer')}>
        Open the full analysis →
      </button>
    </div>
  );
}

export function Landing({ go }: { go: (route: string) => void }) {
  const steps = [
    ['01', 'Extract', 'PDF or image in. Out come test names, values, units, dates, and reference ranges, with every value tied to its source line.'],
    ['02', 'Validate', 'Before anything is interpreted, the Integrity Guardian checks for missing units, absent ranges, duplicate tests, and unreadable text.'],
    ['03', 'Flag', 'Each result is compared with the reference interval printed on the report. These checks are rule-based, so the same input always gives the same flag.'],
    ['04', 'Relate', 'The Hidden Pattern Graph links findings using configured rules. Model suggestions are labeled separately.'],
    ['05', 'Inspect', 'Every output comes with a receipt: the measurement, unit, range, rule, and whether it came from rules or a model.'],
  ];

  const caps = [
    ['analyzer', 'Report Analyzer', 'Structured extraction with per-value source text and extraction confidence.'],
    ['patterns', 'Hidden Pattern Graph', 'Measurements as nodes and relationships as edges. Select an edge to see why it is there.'],
    ['patterns', 'One-Value-Changed', 'Change one synthetic value and see exactly which flags and edges change.'],
    ['evaluation', 'Evidence Receipts', 'Every claim points back to a measurement, rule, or source, or is marked unverified.'],
    ['lab', 'Synthetic Patient Lab', 'Generate synthetic cases, keep held-out splits free of leakage, and track training runs.'],
    ['quality', 'Uncertainty Engine', 'The system abstains when information is missing. It uses qualitative labels until confidence is calibrated.'],
    ['quality', 'Integrity Guardian', 'Explains each data-quality issue and suggests a fix. It never fills in a missing unit or range.'],
  ];

  return (
    <div className="vh-landing">
      <section className="vh-hero">
        <div className="vh-hero__l">
          <Eyebrow>Evidence-first lab report analysis · Hackathon prototype</Eyebrow>
          <h1 className="vh-display">
            Medical insights<br />
            you can <em>inspect.</em>
          </h1>
          <p className="vh-hero__lede">
            Veyra Health turns raw lab reports into structured, explainable findings, each with a receipt. You see what was flagged, the exact measurement, unit, range, and rule behind it, and how sure the system is.
          </p>
          <div className="vh-hero__ctas">
            <button className="vh-btn vh-btn--primary" onClick={() => go('analyzer')}>
              Load sample report
            </button>
            <button className="vh-btn vh-btn--ghost" onClick={() => go('patterns')}>
              Explore the pattern graph
            </button>
          </div>
          <div className="vh-hero__fine">
            Synthetic data only. Not a diagnostic system. Built to support review by qualified healthcare professionals.
          </div>
        </div>
        <div className="vh-hero__r">
          <HeroSpecimen go={go} />
        </div>
      </section>

      <section className="vh-sec">
        <div className="vh-sec__head">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="vh-h2">
            A lab report can list dozens of measurements, and a single flag on one value says nothing about how it relates to the others.
          </h2>
        </div>
        <div className="vh-trio">
          {[
            ['observed', 'Observed', 'Information extracted directly from the report. Every value links back to its line of source text.'],
            ['associated', 'Associated', 'Findings connected by a configured, reviewable rule. The rule ID and its condition are always visible.'],
            ['inferred', 'Inferred', 'Patterns suggested by a model or heuristic. They are labeled with their limitations and never presented as a diagnosis or a cause.'],
          ].map(([k, , d]) => (
            <div key={k} className={`vh-trio__c vh-trio__c--${k}`}>
              <svg viewBox="0 0 120 40" className="vh-trio__edge" aria-hidden="true">
                <circle cx="12" cy="20" r="7" />
                <circle cx="108" cy="20" r="7" />
                {k !== 'observed' && (
                  <line
                    x1="19"
                    y1="20"
                    x2="101"
                    y2="20"
                    strokeDasharray={k === 'inferred' ? '4 5' : '0'}
                  />
                )}
              </svg>
              <KindTag kind={k} />
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vh-sec vh-sec--flow">
        <div className="vh-sec__head">
          <Eyebrow>Workflow</Eyebrow>
          <h2 className="vh-h2">From PDF to inspectable findings in five steps.</h2>
        </div>
        <ol className="vh-flow">
          {steps.map(([n, t, d]) => (
            <li key={n}>
              <span className="mono vh-flow__n">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="vh-sec">
        <div className="vh-sec__head vh-sec__head--row">
          <div>
            <Eyebrow>Capabilities</Eyebrow>
            <h2 className="vh-h2">Seven parts. Every one can be inspected.</h2>
          </div>
        </div>
        <div className="vh-caps">
          {caps.map(([to, t, d], i) => (
            <button key={t} className="vh-cap" onClick={() => go(to)}>
              <span className="mono vh-cap__n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t}</h3>
              <p>{d}</p>
              <span className="vh-cap__go">Open →</span>
            </button>
          ))}
          <div className="vh-cap vh-cap--img">
            <div className="vh-ph">
              <span className="mono">evidence graph · interactive diagnostic trace</span>
            </div>
          </div>
        </div>
      </section>

      <section className="vh-sec vh-honest">
        <div className="vh-honest__l">
          <Eyebrow>Safety &amp; honesty</Eyebrow>
          <h2 className="vh-h2">What Veyra won't do.</h2>
        </div>
        <ul className="vh-honest__list">
          <li>
            <b>No diagnosis.</b> Associations are never presented as diagnoses or causes.
          </li>
          <li>
            <b>No guessed units or ranges.</b> If a unit or range is missing, the result is held for verification.
          </li>
          <li>
            <b>No fabricated metrics.</b> Training runs and metrics that haven't happened are shown as pending.
          </li>
          <li>
            <b>No false precision.</b> Confidence is shown as a number only once it's calibrated. Until then you see qualitative labels.
          </li>
          <li>
            <b>No real patients.</b> The demo uses only synthetic, clearly labeled cases.
          </li>
        </ul>
      </section>

      <section className="vh-cta">
        <h2 className="vh-h2">Inspect a synthetic report.</h2>
        <div className="vh-hero__ctas">
          <button className="vh-btn vh-btn--onDark" onClick={() => go('analyzer')}>
            Start the demo
          </button>
          <button className="vh-btn vh-btn--ghostDark" onClick={() => go('evaluation')}>
            See evaluation &amp; limits
          </button>
        </div>
      </section>
      <footer className="vh-foot">
        <span>
          <b>Veyra Health</b> · Hackathon prototype · 2026
        </span>
        <span>Clinical decision <em>support</em> only. Consult a qualified healthcare professional.</span>
      </footer>
    </div>
  );
}

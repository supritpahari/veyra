import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vhFmtRange, vhVerifyReason } from '../data/vh-data';
import { useVeyra } from '../context/VeyraContext';
import { Eyebrow, FlagBadge, KindTag, fmtVal } from './vh-ui';

export function HeroSpecimen() {
  const navigate = useNavigate();
  const { report, analysis } = useVeyra();
  const rows = report.measurements.slice(0, 7);
  const [sel, setSel] = useState<string>('');
  const activeId = sel || (rows[0]?.id ?? '');
  const m = rows.find(x => x.id === activeId) || rows[0];

  if (!m) {
    return (
      <div className="vh-spec vh-spec--empty">
        <div className="vh-spec__body" style={{ display: 'block', padding: '52px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="vh-card__lbl">Live specimen</div>
          </div>
          <p style={{ margin: '12px auto 0', maxWidth: 300, color: 'var(--ink2)', fontSize: 13, lineHeight: 1.6 }}>
            The specimen appears here once the app loads a report from the Veyra API. Start the backend, then open the dashboard.
          </p>
          <button
            className="vh-btn vh-btn--sm vh-btn--ghost"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/dashboard/analyzer')}
          >
            Open the dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-spec">
      <div className="vh-spec__bar">
        <span className="mono">{report.id.slice(0, 8)}</span>
        <span>·</span>
        <span>{report.source}</span>
        <span className="vh-spec__live">
          <i />Live report
        </span>
      </div>
      <div className="vh-spec__body">
        <table className="vh-spec__tbl">
          <tbody>
            {rows.map(x => (
              <tr
                key={x.id}
                className={x.id === activeId ? 'on' : ''}
                onClick={() => setSel(x.id)}
              >
                <td>{x.short || x.name}</td>
                <td className="mono num">{fmtVal(x)}</td>
                <td className="mono dim">{x.unit || '—'}</td>
                <td>
                  <FlagBadge flag={analysis.flags[x.id] || x.status || 'normal'} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="vh-spec__rcpt">
          <div className="vh-receipt__lbl">Where the value came from</div>
          <div className="vh-spec__name">{m.name}</div>
          <pre className="mono">{m.src || `${m.name}: ${m.value} ${m.unit || ''}`}</pre>
          <div className="vh-spec__kv">
            <span>Healthy range</span>
            <b className="mono">{m.range ? vhFmtRange(m.range) : 'not on report'}</b>
            <span>Based on</span>
            <b>
              <KindTag kind={m.evidence?.method || 'deterministic'} />
            </b>
          </div>
          {vhVerifyReason(m, report) && (
            <div className="vh-receipt__warn">
              <strong>{vhVerifyReason(m, report)}.</strong> Held for review, not guessed.
            </div>
          )}
        </div>
      </div>
      <button className="vh-spec__cta" onClick={() => navigate('/dashboard/analyzer')}>
        Open the full report →
      </button>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();

  const steps = [
    ['01', 'Upload a report', 'Pick a PDF or photo of a lab printout. Reports are loaded through the Veyra API — connect it to explore a case.'],
    ['02', 'Understand it', 'Every test is read out in plain language: the value, the healthy range, whether it is in range, and what it connects to.'],
    ['03', 'Check it', 'Every claim shows the exact source line and rule behind it, so you can verify it against your own report.'],
  ];

  const caps: [string, string, string][] = [
    ['/dashboard/analyzer', 'Read your report', 'Every test with its value, unit, and healthy range — and the exact source line it came from.'],
    ['/dashboard/patterns', 'See how findings connect', 'A graph shows what relates to what, and why the link exists.'],
    ['/dashboard/quality', 'Check report quality', 'Missing or unreadable values are flagged for review, never filled in by the system.'],
    ['/dashboard/evaluation', 'See how well it works', 'The system measures its own accuracy and shows its limits honestly.'],
  ];

  return (
    <div className="vh-landing">
      {/* Hero Section */}
      <section className="vh-hero">
        <div className="vh-hero__l">
          <Eyebrow>Understand your lab report — clearly and safely</Eyebrow>
          <h1 className="vh-display">
            Medical insights<br />
            you can <em>inspect.</em>
          </h1>
          <p className="vh-hero__lede">
            Veyra reads your lab report and explains it in plain language: what is in range, what is out of range, what the results suggest together — and every answer comes with the exact source line you can check yourself.
          </p>
          <div className="vh-hero__ctas">
            <button
              className="vh-btn vh-btn--primary"
              onClick={() => navigate('/dashboard/analyzer')}
            >
              Open the demo
            </button>
            <a className="vh-btn vh-btn--ghost" href="#how">
              How it works ↓
            </a>
          </div>
          <div className="vh-hero__fine">
            Prototype with synthetic data only. Not a diagnostic system — built to support review by qualified healthcare professionals.
          </div>
        </div>
        <div className="vh-hero__r">
          <HeroSpecimen />
        </div>
      </section>

      {/* Why this exists */}
      <section className="vh-sec">
        <div className="vh-sec__head">
          <Eyebrow>Why Veyra exists</Eyebrow>
          <h2 className="vh-h2">
            Lab reports are written for lab systems, not for people.
          </h2>
          <p className="vh-lede">
            You get numbers and abbreviations, and the meaning arrives later — from a person. Veyra bridges that gap: it reads the report, suggests what the values mean together, and shows the exact evidence for every claim so you can check its work.
          </p>
        </div>
        <div className="vh-trio">
          {[
            ['observed', 'Straight from the report', 'Extracted directly from your file. Every value keeps the source text it came from.'],
            ['associated', 'Joined by a rule', 'What tends to appear together is linked by a rule you can open and read.'],
            ['inferred', 'A suggestion, clearly labeled', 'Patterns the model proposes are marked as suggestions — never diagnoses, never causes.'],
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

      {/* How it works */}
      <section className="vh-sec vh-sec--flow" id="how">
        <div className="vh-sec__head">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="vh-h2">From a lab report to something you can actually read — in three steps.</h2>
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

      {/* Capabilities Section */}
      <section className="vh-sec">
        <div className="vh-sec__head vh-sec__head--row">
          <div>
            <Eyebrow>Inside the demo</Eyebrow>
            <h2 className="vh-h2">Four things you can look at.</h2>
          </div>
        </div>
        <div className="vh-caps">
          {caps.map(([route, t, d], i) => (
            <button key={t} className="vh-cap" onClick={() => navigate(route)}>
              <span className="mono vh-cap__n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t}</h3>
              <p>{d}</p>
              <span className="vh-cap__go">Open →</span>
            </button>
          ))}
        </div>
      </section>

      {/* Safety & Honesty Section */}
      <section className="vh-sec vh-honest">
        <div className="vh-honest__l">
          <Eyebrow>Safety &amp; honesty</Eyebrow>
          <h2 className="vh-h2">What Veyra won't do.</h2>
        </div>
        <ul className="vh-honest__list">
          <li>
            <b>No diagnosis.</b> It explains findings in context; only a clinician makes decisions.
          </li>
          <li>
            <b>No guessing.</b> If a unit or range is missing, the result waits for a person — it is never auto-filled.
          </li>
          <li>
            <b>No fake numbers.</b> Metrics that have not been measured yet are shown as pending.
          </li>
          <li>
            <b>No forced precision.</b> Confidence is shown in words until it can be shown as a real number.
          </li>
          <li>
            <b>No real patients.</b> The demo uses only synthetic, clearly labeled cases.
          </li>
        </ul>
      </section>

      {/* CTA Section */}
      <section className="vh-cta">
        <div>
          <h2 className="vh-h2">Connect the API and open a report.</h2>
          <p style={{ margin: '8px 0 0', opacity: 0.85 }}>No sign-up and no real patient data — reports come from your configured backend.</p>
        </div>
        <div className="vh-hero__ctas">
          <button className="vh-btn vh-btn--onDark" onClick={() => navigate('/dashboard/analyzer')}>
            Open the dashboard
          </button>
          <button className="vh-btn vh-btn--ghostDark" onClick={() => navigate('/dashboard/evaluation')}>
            See how it proves its claims
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="vh-foot">
        <span>
          <b>Veyra Health</b> · Hackathon prototype · 2026
        </span>
        <span>Clinical decision <em>support</em> only. Consult a qualified healthcare professional.</span>
      </footer>
    </div>
  );
}

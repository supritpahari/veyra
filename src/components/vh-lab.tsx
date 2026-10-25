import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FlagType } from '../types';
import { SynthBanner, PageHead, FlagBadge, KindTag } from './vh-ui';

function vhRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

interface GenRow {
  id: string;
  test: string;
  value: number;
  unit: string | null;
  range: string | null;
  issue: string;
  expected: FlagType;
}

function genPreview(seed: number, n: number): GenRow[] {
  const R = vhRand(seed);
  const tests: [string, string, number, number, number][] = [
    ['Hemoglobin', 'g/dL', 12.0, 15.5, 1],
    ['Ferritin', 'ng/mL', 15, 150, 0],
    ['Glucose, fasting', 'mg/dL', 70, 99, 0],
    ['Potassium', 'mmol/L', 3.5, 5.1, 1],
    ['Creatinine', 'mg/dL', 0.6, 1.1, 2],
    ['TSH', 'mIU/L', 0.4, 4.0, 2],
  ];
  const issues = [
    'none',
    'none',
    'none',
    'missing_unit',
    'missing_range',
    'duplicate_conflict',
    'low_conf_ocr',
  ];

  return Array.from({ length: n }, (_, i) => {
    const t = tests[Math.floor(R() * tests.length)];
    const span = t[3] - t[2];
    const v = +(t[2] - span * 0.4 + R() * span * 1.8).toFixed(t[4]);
    const iss = issues[Math.floor(R() * issues.length)];
    const exp: FlagType =
      iss === 'none'
        ? v < t[2]
          ? 'low'
          : v > t[3]
          ? 'high'
          : 'normal'
        : 'verify';
    return {
      id: `GEN-${String(seed % 1000).padStart(3, '0')}-${String(i + 1).padStart(2, '0')}`,
      test: t[0],
      value: v,
      unit: iss === 'missing_unit' ? null : t[1],
      range: iss === 'missing_range' ? null : `${t[2]} – ${t[3]}`,
      issue: iss,
      expected: exp,
    };
  });
}

export function StatusDot({ s }: { s: 'pending' | 'notrun' | 'ready' | 'local' | string }) {
  const map: Record<string, [string, string]> = {
    pending: ['Pending', 'verify'],
    notrun: ['Not yet run', 'idle'],
    ready: ['Ready', 'ok'],
    local: ['Local only', 'idle'],
  };
  const [l, t] = map[s] || [s, 'idle'];
  return (
    <span className={`vh-status vh-status--${t}`}>
      <i />
      {l}
    </span>
  );
}

export function AILab() {
  const [seed, setSeed] = useState(1042);
  const rows = useMemo(() => genPreview(seed, 8), [seed]);
  const pipeline = [
    ['Define schema', 'Test name, value, unit, reference interval, quality issue, expected output from reviewed rules.', 'ready'],
    ['Generate dataset', 'Adaption Labs dataset tools (e.g. Invent-a-Dataset), once access is confirmed.', 'pending'],
    ['Validate records', 'Schema checks and range sanity. Expected labels are recomputed with deterministic rules.', 'notrun'],
    ['Split & de-duplicate', 'Train / held-out split with near-duplicate detection across splits to prevent leakage.', 'notrun'],
    ['Train / optimize', 'Adaption training or optimization workflow, after inputs, model types, runtime and credits are verified.', 'notrun'],
    ['Evaluate vs baseline', 'Held-out synthetic cases only.', 'notrun'],
  ];

  return (
    <div className="vh-page">
      <SynthBanner>
        Experimental workspace. Nothing on this page is a real training run unless it is marked Ready.
      </SynthBanner>
      <PageHead
        eyebrow="Dashboard · AI Lab"
        title="How the AI learns — out in the open"
        lede="Build a dataset, run training, and see the real status at every step. Everything here uses synthetic (fake) cases and clearly marked metrics."
      />

      <div className="vh-lab">
        <div className="vh-card vh-lab__pipe">
          <div className="vh-card__lbl">Pipeline</div>
          <ol className="vh-pipe">
            {pipeline.map(([t, d, s], i) => (
              <li key={t} className={`vh-pipe__s vh-pipe__s--${s}`}>
                <span className="mono vh-pipe__n">{i + 1}</span>
                <div>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
                <StatusDot s={s} />
              </li>
            ))}
          </ol>
        </div>

        <div className="vh-lab__stats">
          {[
            ['Dataset size', '—', 'Awaiting generation'],
            ['Training split', '—', 'Not yet run'],
            ['Held-out split', '—', 'Not yet run'],
            ['Training status', 'Not started', 'No run submitted'],
          ].map(([l, v, s]) => (
            <div key={l} className="vh-card vh-stat">
              <div className="vh-card__lbl">{l}</div>
              <div className="vh-stat__v">{v}</div>
              <div className="vh-dim">{s}</div>
            </div>
          ))}
        </div>

        <div className="vh-card vh-card--flush vh-lab__prev">
          <div className="vh-lab__prevhead">
            <div>
              <div className="vh-card__lbl">Schema preview · local generator</div>
              <p className="vh-dim" style={{ margin: '4px 0 0' }}>
                These rows come from a local seeded generator, used only to show the record format. This is <b>not</b> Adaption output.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono vh-dim">seed {seed}</span>
              <button
                className="vh-btn vh-btn--sm vh-btn--ghost"
                onClick={() => setSeed(s => ((s * 48271) % 99991) + 7)}
              >
                Regenerate
              </button>
            </div>
          </div>
          <table className="vh-tbl vh-tbl--compact">
            <thead>
              <tr>
                <th>Record</th>
                <th>Test</th>
                <th className="r">Value</th>
                <th>Unit</th>
                <th>Range</th>
                <th>Injected issue</th>
                <th>Expected (rules)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="mono dim">{r.id}</td>
                  <td>{r.test}</td>
                  <td className="r mono">{r.value}</td>
                  <td className="mono dim">{r.unit || <em className="vh-missing">null</em>}</td>
                  <td className="mono dim">{r.range || <em className="vh-missing">null</em>}</td>
                  <td className="mono">
                    {r.issue === 'none' ? (
                      <span className="vh-dim">none</span>
                    ) : (
                      <span className="vh-chip">{r.issue}</span>
                    )}
                  </td>
                  <td>
                    <FlagBadge flag={r.expected} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="vh-card vh-lab__hist">
          <div className="vh-card__lbl">Experiment history</div>
          <div className="vh-empty vh-empty--box">
            <p>
              <b>No experiments yet.</b>
            </p>
            <p className="vh-dim">
              Runs show up here with their dataset version, model type, runtime, and credits used once they are actually submitted. Example or estimated runs are never shown.
            </p>
          </div>
          <div className="vh-card__lbl" style={{ marginTop: 20 }}>
            Known limitations
          </div>
          <ul className="vh-bul">
            <li>Synthetic distributions may not reflect real laboratory populations.</li>
            <li>Expected labels come from demo rules that still need clinical review.</li>
            <li>Performance on synthetic held-out data tells you nothing about clinical validity.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Evaluation() {
  const navigate = useNavigate();
  const metrics = ['Precision', 'Recall', 'F1 score', 'False-positive rate', 'Abstention rate'];
  const receipts = [
    ['Range flag', 'Ferritin 8 ng/mL is below the stated range of 15–150', 'deterministic', 'Report line 22 · printed reference interval'],
    ['Relationship', 'Low hemoglobin with low MCV', 'deterministic', 'Rule R-CBC-01 · lines 14–15'],
    ['Suggested pattern', 'Elevated platelets with low ferritin', 'unverified', 'Heuristic BASELINE-H-07 · not evaluated'],
    ['Abstention', 'Vitamin B12 shown without a flag', 'deterministic', 'Unit missing on line 25 · not inferred'],
    ['Abstention', 'Potassium not interpreted', 'deterministic', 'Conflicting values on lines 34 and 41'],
  ];

  return (
    <div className="vh-page">
      <SynthBanner />
      <PageHead
        eyebrow="Dashboard · How Well It Works"
        title="How well it works — honestly"
        lede="Accuracy measured against a simple baseline. Until a run finishes, each metric shows its real status instead of a number."
      />

      <div className="vh-eval">
        <div className="vh-card vh-card--flush">
          <div className="vh-eval__head">
            <div className="vh-card__lbl">Held-out synthetic evaluation</div>
            <span className="vh-dim mono">n = — · split pending</span>
          </div>
          <table className="vh-tbl vh-tbl--metrics">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Rule-based baseline</th>
                <th>Adaption-trained model</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(mm => (
                <tr key={mm}>
                  <td>{mm}</td>
                  <td>
                    <span className="vh-pending">Pending · not yet run</span>
                  </td>
                  <td>
                    <span className="vh-pending">Pending · not yet run</span>
                  </td>
                  <td className="dim">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="vh-eval__foot">
            <p>
              <b>Method.</b> The baseline applies the configured reference-range rules and the co-occurrence heuristics. Both systems run on the same held-out synthetic split, with near-duplicates removed against the training split. Metrics are computed per finding. An abstention counts as correct only when the expected label is "verify".
            </p>
          </div>
        </div>

        <div className="vh-card">
          <div className="vh-card__lbl">Traceable explanations · sample receipts</div>
          <ul className="vh-rcptlist">
            {receipts.map(([k, t, kind, ev]) => (
              <li key={t}>
                <span className="vh-chip">{k}</span>
                <div>
                  <b>{t}</b>
                  <span className="mono vh-dim">{ev}</span>
                </div>
                <KindTag kind={kind} />
              </li>
            ))}
          </ul>
          <button className="vh-link" onClick={() => navigate('/dashboard/patterns')}>
            Inspect in Pattern Explorer →
          </button>
        </div>

        <div className="vh-card vh-eval__lim">
          <div className="vh-card__lbl">Limitations</div>
          <div className="vh-limgrid">
            {[
              ['Synthetic only', 'Results show performance on synthetic cases. They do not establish clinical validity or performance on real patients.'],
              ['Not diagnostic', 'Veyra supports review by qualified healthcare professionals. It does not diagnose, treat, or predict outcomes.'],
              ['Uncalibrated confidence', 'Confidence is shown with qualitative labels until calibration is shown on held-out data.'],
              ['Demo rule set', 'Relationship rules are demo configuration and still need review by a clinician.'],
            ].map(([t, d]) => (
              <div key={t}>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

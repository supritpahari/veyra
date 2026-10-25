import { useNavigate } from 'react-router-dom';
import { SynthBanner, PageHead, KindTag } from './vh-ui';

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
            See how it proves each claim →
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

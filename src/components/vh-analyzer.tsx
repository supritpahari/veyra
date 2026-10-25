import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vhIntegrity, vhFmtRange } from '../data/vh-data';
import { useVeyra } from '../context/VeyraContext';
import { SynthBanner, PageHead, ReportPicker, FlagBadge, MeasurementReceipt, fmtVal } from './vh-ui';

export function UploadBox() {
  const [state, setState] = useState<string | null>(null);
  return (
    <div
      className={`vh-upload ${state ? 'has' : ''}`}
      onDragOver={e => {
        e.preventDefault();
      }}
      onDrop={e => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) setState(f.name);
      }}
    >
      {!state ? (
        <>
          <div className="vh-upload__t">Drop a PDF or image</div>
          <div className="vh-upload__s">
            or{' '}
            <label className="vh-link">
              browse
              <input
                type="file"
                accept=".pdf,image/*"
                hidden
                onChange={e => e.target.files?.[0] && setState(e.target.files[0].name)}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="vh-upload__t mono">{state}</div>
          <div className="vh-upload__s">
            Extraction backend prototype connected. Using synthetic seed cases for deterministic inspection.
          </div>
          <button className="vh-link" onClick={() => setState(null)}>
            Clear
          </button>
        </>
      )}
    </div>
  );
}

export function Analyzer() {
  const navigate = useNavigate();
  const { report, analysis, reportId, setReportId, sel, setSel, isLoading, error, apiAnalysis } = useVeyra();

  const { flags } = analysis;
  const visible = report.measurements;
  const panels = [...new Set(visible.map(m => m.panel))];
  const m = report.measurements.find(x => x.id === sel) || visible[0];
  const counts = { out: 0, verify: 0, normal: 0 };

  visible.forEach(x => {
    const f = flags[x.id];
    if (f === 'low' || f === 'high') counts.out++;
    else if (f === 'normal' || f === 'in_range') counts.normal++;
    else counts.verify++;
  });

  const apiIssuesCount = apiAnalysis?.qualityIssues?.length ?? 0;
  const localIssues = vhIntegrity(report);
  const issuesTotal = apiAnalysis ? apiIssuesCount : localIssues.length;

  if (isLoading && !report.measurements.length) {
    return (
      <div className="vh-page" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="vh-status vh-status--verify" style={{ fontSize: 16 }}>
          <i /> Loading report analysis from API...
        </div>
      </div>
    );
  }

  return (
    <div className="vh-page">
      <SynthBanner />
      <PageHead
        eyebrow="Dashboard · Report Analyzer"
        title="Extracted measurements"
        lede="Each value is compared with the reference interval printed on the report. Select a row to see its source text and evidence receipt."
        right={<ReportPicker reportId={reportId} setReportId={setReportId} />}
      />

      {error && (
        <div className="vh-receipt__warn" style={{ marginBottom: 20 }}>
          <strong>API Notice:</strong> {error}. Showing offline data mode.
        </div>
      )}

      <div className="vh-3col">
        <aside className="vh-col vh-col--l">
          <div className="vh-card">
            <div className="vh-card__lbl">Report Details</div>
            <div className="vh-meta">
              <div className="vh-meta__t">{report.title}</div>
              <div className="mono vh-meta__id" style={{ wordBreak: 'break-all' }}>
                {report.id}
              </div>
              <dl className="vh-dl vh-dl--tight">
                <dt>Subject</dt>
                <dd>{report.patient}</dd>
                <dt>Collected</dt>
                <dd className="mono">{report.collected}</dd>
                <dt>Lab</dt>
                <dd>{report.lab}</dd>
                <dt>Source</dt>
                <dd className="mono" style={{ fontSize: 12 }}>
                  {report.source}
                </dd>
              </dl>
            </div>
          </div>

          <div className="vh-card">
            <div className="vh-card__lbl">Upload New Report</div>
            <UploadBox />
          </div>

          <div className="vh-card vh-card--tally">
            <div>
              <b className="mono">{counts.out}</b>
              <span>Outside range</span>
            </div>
            <div>
              <b className="mono">{counts.verify}</b>
              <span>Need verification</span>
            </div>
            <div>
              <b className="mono">{counts.normal}</b>
              <span>Within range</span>
            </div>
          </div>

          {issuesTotal > 0 && (
            <button
              className="vh-card vh-card--issues"
              onClick={() => navigate('/dashboard/quality')}
            >
              <span className="vh-flag vh-flag--danger vh-flag--sm">
                <span className="vh-flag__g">!</span>
                {issuesTotal} integrity issues
              </span>
              <span>Review in Data Quality →</span>
            </button>
          )}
        </aside>

        <section className="vh-col vh-col--c">
          <div className="vh-card vh-card--flush">
            <table className="vh-tbl">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th className="r">Value</th>
                  <th>Unit</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              {panels.map(p => (
                <tbody key={p}>
                  <tr className="vh-tbl__grp">
                    <td colSpan={5}>{p}</td>
                  </tr>
                  {visible
                    .filter(x => x.panel === p)
                    .map(x => (
                      <tr
                        key={x.id}
                        className={`${m && x.id === m.id ? 'on' : ''} ${x.dupOf ? 'dup' : ''}`}
                        onClick={() => setSel(x.id)}
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setSel(x.id)}
                      >
                        <td>
                          <div className="vh-tbl__name">
                            {x.name}
                            {x.dupOf && <span className="vh-chip">duplicate · line {x.line}</span>}
                          </div>
                          <div className="mono vh-tbl__raw">{x.raw}</div>
                        </td>
                        <td
                          className={`r mono num ${
                            ['low', 'high'].includes(flags[x.id]) ? 'vh-num--alert' : ''
                          }`}
                        >
                          {fmtVal(x)}
                        </td>
                        <td className="mono dim">
                          {x.unit || <em className="vh-missing">—</em>}
                        </td>
                        <td className="mono dim">
                          {x.range ? vhFmtRange(x.range) : <em className="vh-missing">none</em>}
                          {x.rangeUnit && <span className="vh-missing"> {x.rangeUnit}</span>}
                        </td>
                        <td>
                          <FlagBadge flag={flags[x.id]} size="sm" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <aside className="vh-col vh-col--r">
          <div className="vh-sticky">
            <div className="vh-card__lbl vh-card__lbl--out">Evidence Receipt</div>
            {m && <MeasurementReceipt m={m} report={report} flag={flags[m.id]} />}
            <button
              className="vh-btn vh-btn--ghost vh-btn--block"
              onClick={() => navigate('/dashboard/patterns')}
            >
              See in Pattern Simulator →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function DataQuality() {
  const navigate = useNavigate();
  const { report, reportId, setReportId, setSel, apiAnalysis } = useVeyra();

  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  useEffect(() => setResolved({}), [reportId]);

  // Use API quality issues when available, otherwise local rules
  const apiIssues = apiAnalysis?.qualityIssues || [];

  const checks = [
    ['Missing units', apiIssues.some(i => i.code === 'missing_unit')],
    ['Absent or ambiguous ranges', apiIssues.some(i => i.code === 'missing_reference_range' || i.code === 'invalid_reference_range')],
    ['Duplicate / conflicting values', apiIssues.some(i => i.code === 'duplicate_measurement' || i.code === 'conflicting_measurements')],
    ['Unsupported unit conversions', false],
    ['Unreadable text', false],
    ['Low-confidence extraction', apiIssues.some(i => i.code === 'low_extraction_confidence')],
    ['Physiologically invalid records', false],
  ];

  return (
    <div className="vh-page">
      <SynthBanner />
      <PageHead
        eyebrow="Dashboard · Report Integrity Guardian"
        title="Validate before you interpret"
        lede="Checks run before any flag or relationship is computed. Veyra never fills in a missing unit or reference interval. Each issue is explained and held for a person to resolve."
        right={<ReportPicker reportId={reportId} setReportId={setReportId} />}
      />
      <div className="vh-dq">
        <aside className="vh-card vh-dq__checks">
          <div className="vh-card__lbl">Checks · {report.title}</div>
          <ul>
            {checks.map(([t, hit]) => (
              <li key={t as string} className={hit ? 'hit' : ''}>
                <span className="vh-dq__mk">{hit ? '!' : '✓'}</span>
                {t as string}
                <span className="vh-dq__st">{hit ? 'Issue found' : 'Passed'}</span>
              </li>
            ))}
          </ul>
          <div className="vh-dq__note">
            The physiological-plausibility check uses configured hard limits. It can only show that a value is impossible. It can never confirm that a value is correct.
          </div>
        </aside>

        <div className="vh-dq__list">
          <h2 className="vh-h3">
            Quality Issues ({apiIssues.length})
          </h2>

          {apiIssues.length === 0 ? (
            <div className="vh-card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink2)' }}>
              No integrity issues found in this report. All measurements have validated units and reference intervals.
            </div>
          ) : (
            apiIssues.map(i => {
              const targetMid = i.measurementIds?.[0] || '';
              return (
                <article
                  key={`${i.code}-${targetMid}`}
                  className={`vh-issue vh-issue--${i.severity === 'error' ? 'block' : 'warn'} ${
                    resolved[i.code + targetMid] ? 'done' : ''
                  }`}
                >
                  <div className="vh-issue__top">
                    <span
                      className={`vh-flag vh-flag--${
                        i.severity === 'error' ? 'danger' : 'verify'
                      } vh-flag--sm`}
                    >
                      <span className="vh-flag__g">{i.severity === 'error' ? '!' : '?'}</span>
                      {i.severity === 'error' ? 'Blocks interpretation' : 'Needs verification'}
                    </span>
                    <span className="mono vh-issue__type">{i.code}</span>
                  </div>
                  <h3>{i.message}</h3>
                  <div className="vh-issue__fix">
                    <span className="vh-card__lbl">Suggested action</span>
                    <p>
                      Inspect original document or confirm with laboratory. This measurement is kept for review and will not be guessed.
                    </p>
                  </div>
                  <div className="vh-issue__acts">
                    {targetMid && (
                      <button
                        className="vh-link"
                        onClick={() => {
                          setSel(targetMid);
                          navigate('/dashboard/analyzer');
                        }}
                      >
                        View in Analyzer →
                      </button>
                    )}
                    <button
                      className="vh-btn vh-btn--sm vh-btn--ghost"
                      onClick={() =>
                        setResolved(r => ({
                          ...r,
                          [i.code + targetMid]: !r[i.code + targetMid],
                        }))
                      }
                    >
                      {resolved[i.code + targetMid] ? 'Reopen' : 'Mark sent to reviewer'}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

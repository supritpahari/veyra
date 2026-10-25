import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vhIntegrity, vhFmtRange } from '../data/vh-data';
import { useVeyra } from '../context/VeyraContext';
import { SynthBanner, PageHead, ReportPicker, FlagBadge, MeasurementReceipt, NoReports, fmtVal } from './vh-ui';

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
            This demo reads synthetic reports only — real-file extraction isn't wired in yet.
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
  const { report, analysis, sel, setSel, isLoading, error, apiAnalysis, refreshReport } = useVeyra();
  const [filter, setFilter] = useState<'all' | 'out' | 'verify' | 'ok'>('all');

  const { flags } = analysis;
  const all = report.measurements;
  const m = all.find(x => x.id === sel) || all[0];
  const counts = { out: 0, verify: 0, ok: 0 };

  all.forEach(x => {
    const f = flags[x.id];
    if (f === 'low' || f === 'high') counts.out++;
    else if (f === 'normal' || f === 'in_range') counts.ok++;
    else counts.verify++;
  });

  const visible =
    filter === 'all'
      ? all
      : all.filter(x => {
          const f = flags[x.id];
          if (filter === 'out') return f === 'low' || f === 'high';
          if (filter === 'ok') return f === 'normal' || f === 'in_range';
          return f !== 'low' && f !== 'high' && f !== 'normal' && f !== 'in_range';
        });
  const panels = [...new Set(visible.map(x => x.panel))];
  const selectStat = (k: 'out' | 'verify' | 'ok') => setFilter(c => (c === k ? 'all' : k));

  const apiIssuesCount = apiAnalysis?.qualityIssues?.length ?? 0;
  const localIssues = vhIntegrity(report);
  const issuesTotal = apiAnalysis ? apiIssuesCount : localIssues.length;

  if (isLoading && !all.length) {
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
        eyebrow="Dashboard · Read Your Report"
        title="Your report, read out"
        lede="Every test with its value, unit, and reference range. Select any row to see the exact source line it came from — or use the counts to focus on what needs attention."
      />

      {error && (
        <div className="vh-receipt__warn" style={{ marginBottom: 20 }}>
          <strong>API Notice:</strong> {error}. No reports are available until the API responds.
        </div>
      )}

      {!all.length ? (
        <NoReports onRefresh={refreshReport} />
      ) : (
      <>
      <header className="vh-band">
        <div className="vh-band__main">
          <div className="vh-band__top">
            <h2 className="vh-band__name">{report.title}</h2>
            <span className="mono vh-band__id">{report.id}</span>
          </div>
          <div className="mono vh-band__meta">
            {[
              report.patient,
              report.collected && `Collected ${report.collected}`,
              report.lab,
              report.source,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </div>
          {issuesTotal > 0 && (
            <button className="vh-band__issues" onClick={() => navigate('/dashboard/quality')}>
              <span className="vh-flag vh-flag--danger vh-flag--sm">
                <span className="vh-flag__g">!</span>
                {issuesTotal} integrity issues
              </span>
              <span>Review in Quality Check →</span>
            </button>
          )}
        </div>

        <div className="vh-band__tally">
          <button
            className={`vh-band__stat vh-band__stat--out ${filter === 'out' ? 'on' : ''}`}
            onClick={() => selectStat('out')}
            aria-pressed={filter === 'out'}
          >
            <b className="mono">{counts.out}</b>
            <span>Outside range</span>
          </button>
          <button
            className={`vh-band__stat vh-band__stat--verify ${filter === 'verify' ? 'on' : ''}`}
            onClick={() => selectStat('verify')}
            aria-pressed={filter === 'verify'}
          >
            <b className="mono">{counts.verify}</b>
            <span>Need verification</span>
          </button>
          <button
            className={`vh-band__stat vh-band__stat--ok ${filter === 'ok' ? 'on' : ''}`}
            onClick={() => selectStat('ok')}
            aria-pressed={filter === 'ok'}
          >
            <b className="mono">{counts.ok}</b>
            <span>Within range</span>
          </button>
        </div>
      </header>

      <div className="vh-split">
        <section className="vh-card vh-card--flush">
          {visible.length === 0 ? (
            <div className="vh-tbl__empty">
              No tests match this filter.{' '}
              <button className="vh-link" onClick={() => setFilter('all')}>
                Show all tests
              </button>
            </div>
          ) : (
            <table className="vh-tbl vh-tbl--read">
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
          )}
        </section>

        <aside className="vh-split__rail">
          <div className="vh-sticky">
            <div className="vh-railstack">
              {m && (
                <div className="vh-railhead">
                  <div className="vh-card__lbl">Evidence receipt · selected test</div>
                  <MeasurementReceipt m={m} report={report} flag={flags[m.id]} />
                </div>
              )}
              <div className="vh-railhead">
                <div className="vh-card__lbl">Upload your own report</div>
                <UploadBox />
              </div>
              <button
                className="vh-btn vh-btn--ghost vh-btn--block"
                onClick={() => navigate('/dashboard/patterns')}
              >
                See how findings connect →
              </button>
            </div>
          </div>
        </aside>
      </div>
      </>
      )}
    </div>
  );
}

export function DataQuality() {
  const navigate = useNavigate();
  const { report, reportId, setReportId, setSel, apiAnalysis, refreshReport } = useVeyra();

  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  useEffect(() => setResolved({}), [reportId]);

  // Use API quality issues when available, otherwise local rules
  const apiIssues = apiAnalysis?.qualityIssues || [];

  if (!report.measurements.length) {
    return (
      <div className="vh-page">
        <SynthBanner />
        <PageHead
          eyebrow="Dashboard · Quality Check"
          title="Checked before you see it"
          lede="These checks run before any result is shown. If something is missing or unreadable, it is flagged for a person — never filled in automatically."
        />
        <NoReports onRefresh={refreshReport} />
      </div>
    );
  }

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
        eyebrow="Dashboard · Quality Check"
        title="Checked before you see it"
        lede="These checks run before any result is shown. If something is missing or unreadable, it is flagged for a person — never filled in automatically."
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

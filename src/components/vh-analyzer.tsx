import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IntegrityIssue } from '../types';
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
            The extraction backend isn't connected in this prototype, so no file is parsed. Use a synthetic sample below.
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
  const { report, analysis, reportId, setReportId, sel, setSel } = useVeyra();

  const { flags } = analysis;
  const visible = report.measurements;
  const panels = [...new Set(visible.map(m => m.panel))];
  const m = report.measurements.find(x => x.id === sel) || visible[0];
  const counts = { out: 0, verify: 0, normal: 0 };
  visible.forEach(x => {
    const f = flags[x.id];
    if (f === 'low' || f === 'high') counts.out++;
    else if (f === 'normal') counts.normal++;
    else counts.verify++;
  });
  const issues = vhIntegrity(report);

  return (
    <div className="vh-page">
      <SynthBanner />
      <PageHead
        eyebrow="Dashboard · Report Analyzer"
        title="Extracted measurements"
        lede="Each value is compared with the reference interval printed on the report. Select a row to see its source text and evidence receipt."
        right={<ReportPicker reportId={reportId} setReportId={setReportId} />}
      />

      <div className="vh-3col">
        <aside className="vh-col vh-col--l">
          <div className="vh-card">
            <div className="vh-card__lbl">Report</div>
            <div className="vh-meta">
              <div className="vh-meta__t">{report.title}</div>
              <div className="mono vh-meta__id">{report.id}</div>
              <dl className="vh-dl vh-dl--tight">
                <dt>Subject</dt>
                <dd>{report.patient}</dd>
                <dt>Collected</dt>
                <dd className="mono">{report.collected}</dd>
                <dt>Lab</dt>
                <dd>{report.lab}</dd>
                <dt>File</dt>
                <dd className="mono" style={{ fontSize: 12 }}>
                  {report.source}
                </dd>
              </dl>
            </div>
          </div>
          <div className="vh-card">
            <div className="vh-card__lbl">Upload</div>
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
          {issues.length > 0 && (
            <button
              className="vh-card vh-card--issues"
              onClick={() => navigate('/dashboard/quality')}
            >
              <span className="vh-flag vh-flag--danger vh-flag--sm">
                <span className="vh-flag__g">!</span>
                {issues.length} integrity issues
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
                  <th>Test</th>
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
                        className={`${x.id === m.id ? 'on' : ''} ${x.dupOf ? 'dup' : ''}`}
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
            <div className="vh-card__lbl vh-card__lbl--out">Evidence receipt</div>
            <MeasurementReceipt m={m} report={report} flag={flags[m.id]} />
            <button
              className="vh-btn vh-btn--ghost vh-btn--block"
              onClick={() => navigate('/dashboard/patterns')}
            >
              See related findings in graph →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function DataQuality() {
  const navigate = useNavigate();
  const { report, reportId, setReportId, setSel } = useVeyra();

  const issues = vhIntegrity(report);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  useEffect(() => setResolved({}), [reportId]);
  const block = issues.filter(i => i.sev === 'block');
  const warn = issues.filter(i => i.sev === 'warn');
  const checks = [
    ['Missing units', issues.some(i => i.type === 'Missing unit')],
    ['Absent or ambiguous ranges', issues.some(i => i.type === 'Missing reference range')],
    ['Duplicate / conflicting values', issues.some(i => i.type === 'Conflicting duplicate')],
    ['Unsupported unit conversions', issues.some(i => i.type === 'Unsupported conversion')],
    ['Unreadable text', issues.some(i => i.type === 'Unreadable text')],
    ['Low-confidence extraction', issues.some(i => i.type === 'Low-confidence extraction')],
    ['Physiologically invalid records', false],
  ];

  const IssueCard = ({ i }: { i: IntegrityIssue }) => (
    <article className={`vh-issue vh-issue--${i.sev} ${resolved[i.id] ? 'done' : ''}`}>
      <div className="vh-issue__top">
        <span
          className={`vh-flag vh-flag--${i.sev === 'block' ? 'danger' : 'verify'} vh-flag--sm`}
        >
          <span className="vh-flag__g">{i.sev === 'block' ? '!' : '?'}</span>
          {i.sev === 'block' ? 'Blocks interpretation' : 'Needs verification'}
        </span>
        <span className="mono vh-issue__type">{i.type}</span>
      </div>
      <h3>{i.title}</h3>
      <p>{i.detail}</p>
      <div className="vh-issue__fix">
        <span className="vh-card__lbl">Suggested correction</span>
        <p>{i.fix}</p>
      </div>
      <div className="vh-issue__acts">
        <button
          className="vh-link"
          onClick={() => {
            setSel(i.mid);
            navigate('/dashboard/analyzer');
          }}
        >
          View source in Analyzer →
        </button>
        <button
          className="vh-btn vh-btn--sm vh-btn--ghost"
          onClick={() => setResolved(r => ({ ...r, [i.id]: !r[i.id] }))}
        >
          {resolved[i.id] ? 'Reopen' : 'Mark sent to reviewer'}
        </button>
      </div>
    </article>
  );

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
          <div className="vh-card__lbl">Checks · {report.id}</div>
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
            The physiological-plausibility check uses configured hard limits (demo values). It can only show that a value is impossible. It can never confirm that a value is correct.
          </div>
        </aside>
        <div className="vh-dq__list">
          {block.length > 0 && <h2 className="vh-h3">Blocking · {block.length}</h2>}
          {block.map(i => (
            <IssueCard key={i.id} i={i} />
          ))}
          {warn.length > 0 && <h2 className="vh-h3">Needs verification · {warn.length}</h2>}
          {warn.map(i => (
            <IssueCard key={i.id} i={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

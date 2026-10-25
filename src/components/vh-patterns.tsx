import { useState, useEffect, useMemo } from 'react';
import type { Report, Analysis, Edge, Measurement } from '../types';
import { VH_FLAG_META, VH_RULESET, VH_REPORTS, vhAnalyze, vhFmtRange } from '../data/vh-data';
import { SynthBanner, PageHead, ReportPicker, FlagBadge, KindTag, MeasurementReceipt, Eyebrow, fmtVal } from './vh-ui';

const VH_GW = 800,
  VH_GH = 520;

export interface FocusTarget {
  type: 'node' | 'edge';
  id: string;
}

export function PatternGraph({
  report,
  analysis,
  base,
  focus,
  setFocus,
  changed,
}: {
  report: Report;
  analysis: Analysis;
  base: Analysis | null;
  focus: FocusTarget | null;
  setFocus: (f: FocusTarget | null) => void;
  changed: Set<string> | null;
}) {
  const nodes = report.measurements.filter(m => !m.hidden);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const { flags, active } = analysis;
  const selNode = focus?.type === 'node' ? focus.id : null;
  const selEdge = focus?.type === 'edge' ? focus.id : null;
  const neighbors = new Set<string>();

  if (selNode) {
    report.edges.forEach(e => {
      if (active[e.id] && (e.a === selNode || e.b === selNode)) {
        neighbors.add(e.a);
        neighbors.add(e.b);
      }
    });
  }
  if (selEdge) {
    const e = report.edges.find(x => x.id === selEdge);
    if (e) {
      neighbors.add(e.a);
      neighbors.add(e.b);
    }
  }
  const dimming = Boolean(selNode || selEdge);

  return (
    <svg
      className="vh-graph"
      viewBox={`0 0 ${VH_GW} ${VH_GH}`}
      onClick={() => setFocus(null)}
    >
      <defs>
        <pattern id="vhgrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="vh-graph__dot" />
        </pattern>
      </defs>
      <rect width={VH_GW} height={VH_GH} fill="url(#vhgrid)" />
      {report.edges.map(e => {
        const A = byId[e.a],
          B = byId[e.b];
        if (!A || !B) return null;
        const on = active[e.id];
        const wasOn = base ? base.active[e.id] : on;
        const diff = base && on !== wasOn;
        const isSel = selEdge === e.id;
        const lit = isSel || (selNode && on && (e.a === selNode || e.b === selNode));
        const [x1, y1] = A.pos,
          [x2, y2] = B.pos;
        const mx = (x1 + x2) / 2,
          my = (y1 + y2) / 2;

        if (!on && !diff) {
          return (
            <line
              key={e.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="vh-edge vh-edge--off"
            />
          );
        }

        return (
          <g
            key={e.id}
            className={`vh-edge-g ${dimming && !lit ? 'dim' : ''}`}
            onClick={ev => {
              ev.stopPropagation();
              setFocus({ type: 'edge', id: e.id });
            }}
          >
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="vh-edge__hit" />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={`vh-edge vh-edge--${e.kind} ${!on ? 'vh-edge--gone' : ''} ${
                isSel || lit ? 'sel' : ''
              }`}
            />
            {diff && (
              <g transform={`translate(${mx},${my})`}>
                <rect
                  x="-30"
                  y="-11"
                  width="60"
                  height="22"
                  rx="11"
                  className={`vh-diffpill ${on ? 'add' : 'rem'}`}
                />
                <text textAnchor="middle" y="4" className="vh-diffpill__t">
                  {on ? '+ new' : '− removed'}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {nodes.map(n => {
        const f = flags[n.id];
        const meta = VH_FLAG_META[f];
        const isSel = selNode === n.id;
        const dim = dimming && !isSel && !neighbors.has(n.id);
        const ch = changed && changed.has(n.id);
        const label = n.short || n.name;
        const w = Math.max(92, label.length * 7.4 + 44);

        return (
          <g
            key={n.id}
            transform={`translate(${n.pos[0]},${n.pos[1]})`}
            className={`vh-node vh-node--${meta.tone} ${isSel ? 'sel' : ''} ${
              dim ? 'dim' : ''
            } ${ch ? 'ch' : ''}`}
            onClick={ev => {
              ev.stopPropagation();
              setFocus({ type: 'node', id: n.id });
            }}
          >
            {ch && (
              <rect
                x={-w / 2 - 5}
                y={-27}
                width={w + 10}
                height={54}
                rx={14}
                className="vh-node__ch"
              />
            )}
            <rect
              x={-w / 2}
              y={-22}
              width={w}
              height={44}
              rx={10}
              className="vh-node__box"
            />
            <text x={-w / 2 + 12} y={-4} className="vh-node__l">
              {label}
            </text>
            <text x={-w / 2 + 12} y={12} className="vh-node__v">
              {n.value == null ? '—' : n.value} {n.unit || ''}
            </text>
            <g transform={`translate(${w / 2 - 14},-8)`}>
              <circle r="8" className="vh-node__fl" />
              <text textAnchor="middle" y="3.5" className="vh-node__flt">
                {meta.glyph}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function EdgePanel({
  e,
  report,
  analysis,
}: {
  e: Edge;
  report: Report;
  analysis: Analysis;
}) {
  const A = report.measurements.find(m => m.id === e.a);
  const B = report.measurements.find(m => m.id === e.b);
  const on = analysis.active[e.id];

  return (
    <div className="vh-receipt">
      <div className="vh-receipt__head">
        <div>
          <div className="vh-receipt__name">{e.title}</div>
          <div className="vh-receipt__sub mono">{e.rule}</div>
        </div>
        <KindTag kind={e.kind} />
      </div>
      <p className="vh-receipt__why">{e.why}</p>
      <div className="vh-receipt__lbl">Supporting measurements</div>
      {[A, B].filter(Boolean).map(m => {
        const item = m as Measurement;
        return (
          <div key={item.id} className="vh-support">
            <span>{item.name}</span>
            <span className="mono">
              {fmtVal(item)} {item.unit}
            </span>
            <FlagBadge flag={analysis.flags[item.id]} size="sm" />
          </div>
        );
      })}
      <dl className="vh-dl">
        <dt>Condition</dt>
        <dd>{e.notWhen}</dd>
        <dt>Status</dt>
        <dd>{on ? 'Condition met' : 'Condition not met'}</dd>
        <dt>Logic</dt>
        <dd>
          {e.kind === 'inferred' ? (
            <KindTag kind="unverified" />
          ) : (
            <KindTag kind="deterministic" />
          )}
        </dd>
        <dt>Rule set</dt>
        <dd>{VH_RULESET}</dd>
      </dl>
      <div className="vh-receipt__warn">
        <strong>Not a diagnosis.</strong> This shows co-occurrence under a configured rule. It does not mean either value causes the other.
      </div>
    </div>
  );
}

export function PatternExplorer({
  report,
  analysis,
  reportId,
  setReportId,
  sel,
}: {
  report: Report;
  analysis: Analysis;
  reportId: string;
  setReportId: (id: string) => void;
  sel: string;
  setSel?: (id: string) => void;
}) {
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const simmable = report.measurements.filter(m => m.sim && !m.hidden);
  const [simId, setSimId] = useState(simmable[0]?.id || 'ferr');
  const [simVal, setSimVal] = useState<number | null>(null);
  const [view, setView] = useState<'original' | 'modified'>('modified');

  useEffect(() => {
    setFocus(null);
    const currReport = VH_REPORTS.find(r => r.id === reportId);
    const firstSim = currReport?.measurements.find(m => m.sim)?.id || 'ferr';
    setSimId(firstSim);
    setSimVal(null);
  }, [reportId]);

  useEffect(() => {
    if (sel && report.measurements.find(m => m.id === sel && !m.hidden)) {
      setFocus({ type: 'node', id: sel });
    }
  }, [sel, report]);

  const simM = report.measurements.find(m => m.id === simId) || simmable[0];
  const curVal = simVal == null ? simM.value : simVal;
  const modReport = useMemo(
    () => ({
      ...report,
      measurements: report.measurements.map(m =>
        m.id === simM.id ? { ...m, value: curVal } : m
      ),
    }),
    [report, simM.id, curVal]
  );
  const modAnalysis = useMemo(() => vhAnalyze(modReport), [modReport]);
  const isMod = curVal !== simM.value;

  const flagDiffs = report.measurements.filter(
    m => !m.hidden && analysis.flags[m.id] !== modAnalysis.flags[m.id]
  );
  const edgeDiffs = report.edges.filter(
    e => analysis.active[e.id] !== modAnalysis.active[e.id]
  );
  const changed = new Set([...(isMod ? [simM.id] : []), ...flagDiffs.map(m => m.id)]);

  const showMod = view === 'modified' && isMod;
  const gReport = showMod ? modReport : report;
  const gAnalysis = showMod ? modAnalysis : analysis;

  const fNode =
    focus?.type === 'node'
      ? gReport.measurements.find(m => m.id === focus.id)
      : null;
  const fEdge =
    focus?.type === 'edge' ? report.edges.find(e => e.id === focus.id) : null;
  const activeEdges = report.edges.filter(e => gAnalysis.active[e.id]);

  return (
    <div className="vh-page">
      <SynthBanner />
      <PageHead
        eyebrow="Pattern Explorer"
        title="Hidden Pattern Graph"
        lede="Nodes are measurements and edges are relationships. Select a node to highlight related findings, or an edge to see why it's shown."
        right={<ReportPicker reportId={reportId} setReportId={setReportId} />}
      />

      <div className="vh-3col vh-3col--graph">
        <aside className="vh-col vh-col--l">
          <div className="vh-card">
            <div className="vh-card__lbl">Legend</div>
            <div className="vh-legend">
              <div>
                <svg width="40" height="10">
                  <line x1="0" y1="5" x2="40" y2="5" className="vh-edge vh-edge--associated" />
                </svg>
                <KindTag kind="associated" />
              </div>
              <div>
                <svg width="40" height="10">
                  <line x1="0" y1="5" x2="40" y2="5" className="vh-edge vh-edge--inferred" />
                </svg>
                <KindTag kind="inferred" />
              </div>
              <div>
                <svg width="40" height="10">
                  <line x1="0" y1="5" x2="40" y2="5" className="vh-edge vh-edge--off" />
                </svg>
                <span className="vh-legend__t">Rule not triggered</span>
              </div>
              <div className="vh-legend__nodes">
                {(['low', 'normal', 'verify', 'conflict'] as const).map(f => (
                  <FlagBadge key={f} flag={f} size="sm" />
                ))}
              </div>
            </div>
          </div>
          <div className="vh-card">
            <div className="vh-card__lbl">Active relationships · {activeEdges.length}</div>
            <ul className="vh-elist">
              {activeEdges.map(e => (
                <li key={e.id}>
                  <button
                    className={focus?.id === e.id ? 'on' : ''}
                    onClick={() => setFocus({ type: 'edge', id: e.id })}
                  >
                    <span>{e.title}</span>
                    <KindTag kind={e.kind} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="vh-col vh-col--c">
          <div className="vh-card vh-card--flush vh-graphwrap">
            <div className="vh-graphwrap__bar">
              <span className="mono">{report.id}</span>
              {isMod && (
                <div className="vh-seg vh-seg--sm">
                  <button
                    className={view === 'original' ? 'on' : ''}
                    onClick={() => setView('original')}
                  >
                    Original
                  </button>
                  <button
                    className={view === 'modified' ? 'on' : ''}
                    onClick={() => setView('modified')}
                  >
                    Modified
                  </button>
                </div>
              )}
            </div>
            <PatternGraph
              report={gReport}
              analysis={gAnalysis}
              base={showMod ? analysis : null}
              focus={focus}
              setFocus={setFocus}
              changed={showMod ? changed : null}
            />
          </div>

          <div className="vh-card vh-sim">
            <div className="vh-sim__head">
              <div>
                <Eyebrow>One-Value-Changed Simulator</Eyebrow>
                <h3 className="vh-h3" style={{ margin: 0 }}>
                  Change one synthetic value and compare
                </h3>
              </div>
              <select
                className="vh-select"
                value={simM.id}
                onChange={e => {
                  setSimId(e.target.value);
                  setSimVal(null);
                  setView('modified');
                }}
              >
                {simmable.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.short || m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="vh-sim__ctl">
              <div className="vh-sim__val">
                <span className="mono">{curVal}</span>
                <small>{simM.unit}</small>
              </div>
              <div className="vh-sim__track">
                {simM.sim && (
                  <input
                    type="range"
                    min={simM.sim[0]}
                    max={simM.sim[1]}
                    step={simM.sim[2]}
                    value={curVal ?? 0}
                    onChange={e => {
                      setSimVal(+e.target.value);
                      setView('modified');
                    }}
                  />
                )}
                <div className="vh-sim__scale mono">
                  <span>{simM.sim?.[0]}</span>
                  <span>
                    ref {vhFmtRange(simM.range)} · original {simM.value}
                  </span>
                  <span>{simM.sim?.[1]}</span>
                </div>
              </div>
              <button
                className="vh-btn vh-btn--sm vh-btn--ghost"
                disabled={!isMod}
                onClick={() => setSimVal(null)}
              >
                Reset
              </button>
            </div>
            <div className="vh-sim__diff">
              <div>
                <div className="vh-card__lbl">
                  Rule-based changes <KindTag kind="deterministic" />
                </div>
                {!isMod && <p className="vh-dim">Move the slider to see changes.</p>}
                {isMod &&
                  flagDiffs.length === 0 &&
                  edgeDiffs.filter(e => e.kind !== 'inferred').length === 0 && (
                    <p className="vh-dim">No flags or rule edges changed.</p>
                  )}
                {flagDiffs.map(m => (
                  <div key={m.id} className="vh-diffrow">
                    <span>{m.short || m.name}</span>
                    <FlagBadge flag={analysis.flags[m.id]} size="sm" />
                    <span className="vh-arrow">→</span>
                    <FlagBadge flag={modAnalysis.flags[m.id]} size="sm" />
                  </div>
                ))}
                {edgeDiffs
                  .filter(e => e.kind !== 'inferred')
                  .map(e => (
                    <div key={e.id} className="vh-diffrow">
                      <span>{e.title}</span>
                      <span
                        className={`vh-chip ${
                          modAnalysis.active[e.id] ? 'add' : 'rem'
                        }`}
                      >
                        {modAnalysis.active[e.id] ? 'edge added' : 'edge removed'}
                      </span>
                      <span className="mono vh-dim">{e.rule}</span>
                    </div>
                  ))}
              </div>
              <div>
                <div className="vh-card__lbl">
                  Model predictions <KindTag kind="model" />
                </div>
                {edgeDiffs
                  .filter(e => e.kind === 'inferred')
                  .map(e => (
                    <div key={e.id} className="vh-diffrow">
                      <span>{e.title}</span>
                      <span
                        className={`vh-chip ${
                          modAnalysis.active[e.id] ? 'add' : 'rem'
                        }`}
                      >
                        {modAnalysis.active[e.id]
                          ? 'suggestion added'
                          : 'suggestion removed'}
                      </span>
                      <span className="mono vh-dim">baseline heuristic</span>
                    </div>
                  ))}
                <p className="vh-dim vh-sim__fine">
                  No trained model is connected (status: <b>pending</b>), so only the baseline heuristic responds here. This tool recomputes flags for a synthetic report. It does not predict any real patient's clinical outcome.
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="vh-col vh-col--r">
          <div className="vh-sticky">
            <div className="vh-card__lbl vh-card__lbl--out">
              {fEdge ? 'Why this edge' : fNode ? 'Measurement' : 'Evidence'}
            </div>
            {fEdge && (
              <EdgePanel e={fEdge} report={gReport} analysis={gAnalysis} />
            )}
            {fNode && (
              <>
                <MeasurementReceipt
                  m={fNode}
                  report={gReport}
                  flag={gAnalysis.flags[fNode.id]}
                />
                <div className="vh-card__lbl" style={{ marginTop: 18 }}>
                  Connected
                </div>
                <ul className="vh-elist">
                  {report.edges
                    .filter(
                      e =>
                        gAnalysis.active[e.id] &&
                        (e.a === fNode.id || e.b === fNode.id)
                    )
                    .map(e => (
                      <li key={e.id}>
                        <button
                          onClick={() => setFocus({ type: 'edge', id: e.id })}
                        >
                          <span>{e.title}</span>
                          <KindTag kind={e.kind} />
                        </button>
                      </li>
                    ))}
                  {report.edges.filter(
                    e =>
                      gAnalysis.active[e.id] &&
                      (e.a === fNode.id || e.b === fNode.id)
                  ).length === 0 && (
                    <li className="vh-dim" style={{ padding: '6px 0' }}>
                      No active relationships. An isolated value is reported on its own.
                    </li>
                  )}
                </ul>
              </>
            )}
            {!focus && (
              <div className="vh-empty">
                <p>Select a node or an edge in the graph.</p>
                <p className="vh-dim">
                  Associated edges come from configured rules you can review. Inferred edges are suggestions with no evaluation yet. Neither one is a diagnosis.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

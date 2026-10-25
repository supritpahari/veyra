import { useState, useEffect, useRef } from 'react';
import type { Report, Analysis, ApiSimulationResult, FlagType } from '../types';
import { VH_FLAG_META, vhFmtRange } from '../data/vh-data';
import { useVeyra } from '../context/VeyraContext';
import { SynthBanner, PageHead, ReportPicker, FlagBadge, MeasurementReceipt, Eyebrow } from './vh-ui';

const VH_GW = 800,
  VH_GH = 520;

export interface FocusTarget {
  type: 'node' | 'edge';
  id: string;
}

export function PatternGraph({
  report,
  analysis,
  focus,
  setFocus,
  simulatedChange,
}: {
  report: Report;
  analysis: Analysis;
  focus: FocusTarget | null;
  setFocus: (f: FocusTarget | null) => void;
  simulatedChange?: { measurementId: string; simulatedStatus: string } | null;
}) {
  const nodes = report.measurements.filter(m => !m.hidden);
  const { flags } = analysis;
  const selNode = focus?.type === 'node' ? focus.id : null;

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

      {nodes.map(n => {
        const isSimChanged = simulatedChange?.measurementId === n.id;
        const f = isSimChanged ? (simulatedChange.simulatedStatus as FlagType) : flags[n.id] || 'normal';
        const meta = VH_FLAG_META[f] || VH_FLAG_META.verify;
        const isSel = selNode === n.id;
        const label = n.short || n.name;
        const w = Math.max(100, label.length * 7.5 + 44);

        return (
          <g
            key={n.id}
            transform={`translate(${n.pos[0]},${n.pos[1]})`}
            className={`vh-node vh-node--${meta.tone} ${isSel ? 'sel' : ''} ${isSimChanged ? 'ch' : ''}`}
            onClick={ev => {
              ev.stopPropagation();
              setFocus({ type: 'node', id: n.id });
            }}
          >
            {isSimChanged && (
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

export function PatternExplorer() {
  const { report, analysis, reportId, setReportId, sel, runSimulation, apiAnalysis } = useVeyra();

  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const simmable = report.measurements.filter(m => m.sim && !m.hidden);
  const [simId, setSimId] = useState<string>(() => simmable[0]?.id || '');
  const [simVal, setSimVal] = useState<number | null>(null);
  const [simResult, setSimResult] = useState<ApiSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    setFocus(null);
    if (simmable.length > 0) {
      setSimId(simmable[0].id);
      setSimVal(simmable[0].value ?? 5);
      setSimResult(null);
    }
  }, [reportId]);

  useEffect(() => {
    if (sel && report.measurements.find(m => m.id === sel && !m.hidden)) {
      setFocus({ type: 'node', id: sel });
      setSimId(sel);
      const target = report.measurements.find(m => m.id === sel);
      if (target?.value != null) {
        setSimVal(target.value);
      }
    }
  }, [sel, report]);

  const simM = report.measurements.find(m => m.id === simId) || simmable[0];
  const curVal = simVal == null ? (simM?.value ?? 0) : simVal;
  const isMod = simM ? curVal !== simM.value : false;

  // Trigger backend simulation via POST /api/v1/reports/:reportId/simulations
  const handleSliderChange = (newVal: number) => {
    setSimVal(newVal);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      if (!simM) return;
      setIsSimulating(true);
      try {
        const res = await runSimulation(simM.id, newVal);
        setSimResult(res);
      } catch (err) {
        console.warn('Simulation API error:', err);
      } finally {
        setIsSimulating(false);
      }
    }, 250);
  };

  const resetSimulation = () => {
    if (simM) {
      setSimVal(simM.value);
      setSimResult(null);
    }
  };

  const fNode =
    focus?.type === 'node'
      ? report.measurements.find(m => m.id === focus.id)
      : null;

  return (
    <div className="vh-page">
      <SynthBanner />
      <PageHead
        eyebrow="Dashboard · See Connections"
        title="How findings connect"
        lede="What the values suggest together, joined by rules you can open and read. Suggestions from the model are labeled separately."
        right={<ReportPicker reportId={reportId} setReportId={setReportId} />}
      />

      <div className="vh-3col vh-3col--graph">
        <aside className="vh-col vh-col--l">
          <div className="vh-card">
            <div className="vh-card__lbl">Status Legend</div>
            <div className="vh-legend">
              <div className="vh-legend__nodes">
                {(['low', 'in_range', 'high', 'needs_verification'] as const).map(f => (
                  <FlagBadge key={f} flag={f} size="sm" />
                ))}
              </div>
            </div>
          </div>

          <div className="vh-card">
            <div className="vh-card__lbl">Relationships</div>
            <p className="vh-dim" style={{ fontSize: 13, margin: '4px 0 8px' }}>
              Inference status:{' '}
              <span className="mono">
                {apiAnalysis?.inferenceStatus || 'not_configured'}
              </span>
            </p>
            <div className="vh-empty" style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink2)' }}>
                Per backend safety specifications, relationships and inferred diagnostic edges are not fabricated without trained clinical models.
              </p>
            </div>
          </div>
        </aside>

        <section className="vh-col vh-col--c">
          <div className="vh-card vh-card--flush vh-graphwrap">
            <div className="vh-graphwrap__bar">
              <span className="mono">{report.title}</span>
              {isMod && (
                <span className="vh-chip add">
                  {isSimulating ? 'Computing API simulation...' : 'Simulation active'}
                </span>
              )}
            </div>
            <PatternGraph
              report={report}
              analysis={analysis}
              focus={focus}
              setFocus={setFocus}
              simulatedChange={
                simResult?.changedMeasurement
                  ? {
                      measurementId: simResult.changedMeasurement.measurementId,
                      simulatedStatus: simResult.changedMeasurement.simulatedStatus,
                    }
                  : null
              }
            />
          </div>

          {simM && (
            <div className="vh-card vh-sim">
              <div className="vh-sim__head">
                <div>
                  <Eyebrow>One-Value-Changed Simulator</Eyebrow>
                  <h3 className="vh-h3" style={{ margin: 0 }}>
                    Substitute one measurement value (Live API)
                  </h3>
                </div>
                <select
                  className="vh-select"
                  value={simM.id}
                  onChange={e => {
                    setSimId(e.target.value);
                    const selected = report.measurements.find(m => m.id === e.target.value);
                    setSimVal(selected?.value ?? 0);
                    setSimResult(null);
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
                  <small>{simM.unit || ''}</small>
                </div>
                <div className="vh-sim__track">
                  {simM.sim && (
                    <input
                      type="range"
                      min={simM.sim[0]}
                      max={simM.sim[1]}
                      step={simM.sim[2]}
                      value={curVal ?? 0}
                      onChange={e => handleSliderChange(+e.target.value)}
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
                  onClick={resetSimulation}
                >
                  Reset
                </button>
              </div>

              <div className="vh-sim__diff">
                <div>
                  <div className="vh-card__lbl">Backend Deterministic Output</div>
                  {!isMod && <p className="vh-dim">Move the slider to run API simulation.</p>}

                  {simResult?.changedMeasurement && (
                    <div style={{ marginTop: 10 }}>
                      <div className="vh-diffrow">
                        <span>Original Status</span>
                        <FlagBadge flag={simResult.changedMeasurement.originalStatus as FlagType} size="sm" />
                      </div>
                      <div className="vh-diffrow">
                        <span>Simulated Status ({simResult.changedMeasurement.simulatedValue} {simM.unit})</span>
                        <FlagBadge flag={simResult.changedMeasurement.simulatedStatus as FlagType} size="sm" />
                      </div>
                      <div className="vh-diffrow">
                        <span>Status Changed</span>
                        <b style={{ color: simResult.changedMeasurement.statusChanged ? 'var(--amber)' : 'var(--ok)' }}>
                          {simResult.changedMeasurement.statusChanged ? 'Yes' : 'No (remains same)'}
                        </b>
                      </div>
                    </div>
                  )}

                  <p className="vh-dim vh-sim__fine">
                    <b>Notice:</b> This comparison is computed deterministically by the backend. It is non-persistent and never writes to MySQL.
                  </p>
                </div>

                <div>
                  <div className="vh-card__lbl">Clinical Disclaimer</div>
                  <div className="vh-empty vh-empty--box" style={{ padding: 12 }}>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink2)' }}>
                      {simResult?.disclaimer ||
                        'This synthetic, one-value comparison is not a prediction of a clinical outcome. Always consult qualified clinical staff.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="vh-col vh-col--r">
          <div className="vh-sticky">
            <div className="vh-card__lbl vh-card__lbl--out">
              {fNode ? 'Selected Measurement' : 'Evidence Inspector'}
            </div>
            {fNode ? (
              <MeasurementReceipt
                m={fNode}
                report={report}
                flag={analysis.flags[fNode.id]}
              />
            ) : (
              <div className="vh-empty">
                <p>Select any node in the graph.</p>
                <p className="vh-dim">
                  Inspect its extracted source text, reference limits, and extraction confidence.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

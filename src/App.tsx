import { useState, useEffect, useMemo } from 'react';
import type { TweaksState } from './types';
import { VH_REPORTS, vhAnalyze, vhFlag } from './data/vh-data';
import { Logo } from './components/vh-ui';
import { Landing } from './components/vh-landing';
import { Analyzer, DataQuality } from './components/vh-analyzer';
import { PatternExplorer } from './components/vh-patterns';
import { AILab, Evaluation } from './components/vh-lab';
import { TweaksPanel } from './components/TweaksPanel';

const VH_ROUTES = [
  ['overview', 'Overview'],
  ['analyzer', 'Report Analyzer'],
  ['patterns', 'Pattern Explorer'],
  ['lab', 'AI Lab'],
  ['quality', 'Data Quality'],
  ['evaluation', 'Evaluation & Evidence'],
] as const;

export default function App() {
  const [tweaks, setTweaks] = useState<TweaksState>(() => {
    try {
      const saved = localStorage.getItem('vh.tweaks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      theme: 'clinical',
      font: 'plex',
      accent: '#0E7490',
    };
  });

  const [route, setRoute] = useState<string>(
    () => localStorage.getItem('vh.route') || 'overview'
  );
  const [reportId, setReportId] = useState<string>(
    () => localStorage.getItem('vh.report') || VH_REPORTS[0].id
  );
  const [sel, setSel] = useState<string>('ferr');

  useEffect(() => {
    try {
      localStorage.setItem('vh.route', route);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route]);

  useEffect(() => {
    try {
      localStorage.setItem('vh.report', reportId);
      localStorage.setItem('vh.tweaks', JSON.stringify(tweaks));
    } catch {}
    const r = VH_REPORTS.find(x => x.id === reportId) || VH_REPORTS[0];
    const flagged = r.measurements.find(m => vhFlag(m, r) !== 'normal');
    setSel(flagged ? flagged.id : r.measurements[0].id);
  }, [reportId, tweaks]);

  useEffect(() => {
    const h = document.documentElement;
    h.dataset.theme = tweaks.theme;
    h.dataset.font = tweaks.font;
    if (tweaks.theme === 'dark') {
      h.style.removeProperty('--accent');
    } else {
      h.style.setProperty('--accent', tweaks.accent);
    }
  }, [tweaks]);

  const report = useMemo(
    () => VH_REPORTS.find(r => r.id === reportId) || VH_REPORTS[0],
    [reportId]
  );
  const analysis = useMemo(() => vhAnalyze(report), [report]);

  const handleTweakChange = (key: keyof TweaksState, val: string) => {
    setTweaks(prev => ({ ...prev, [key]: val }));
  };

  const props = {
    report,
    analysis,
    reportId,
    setReportId,
    sel,
    setSel,
    go: setRoute,
  };

  return (
    <div className="vh-app-container">
      <header className="vh-top">
        <div className="vh-top__in">
          <button
            type="button"
            className="vh-logo"
            onClick={() => setRoute('overview')}
            aria-label="Veyra Health Home"
          >
            <Logo />
            <span>Veyra Health</span>
          </button>
          <nav className="vh-nav" aria-label="Main Navigation">
            {VH_ROUTES.map(([k, l]) => (
              <button
                key={k}
                type="button"
                className={route === k ? 'on' : ''}
                onClick={() => setRoute(k)}
              >
                {l}
              </button>
            ))}
          </nav>
          <span className="vh-top__tag">PROTOTYPE · NOT DIAGNOSTIC</span>
        </div>
      </header>

      <main className="vh-main" data-screen-label={route}>
        {route === 'overview' && <Landing go={setRoute} />}
        {route === 'analyzer' && <Analyzer {...props} />}
        {route === 'patterns' && <PatternExplorer key={reportId} {...props} />}
        {route === 'quality' && <DataQuality {...props} />}
        {route === 'lab' && <AILab />}
        {route === 'evaluation' && <Evaluation go={setRoute} />}
      </main>

      <TweaksPanel tweaks={tweaks} onChange={handleTweakChange} />
    </div>
  );
}

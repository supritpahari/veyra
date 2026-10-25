import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Report, Analysis, TweaksState } from '../types';
import { VH_REPORTS, vhAnalyze, vhFlag } from '../data/vh-data';

interface VeyraContextValue {
  reportId: string;
  setReportId: (id: string) => void;
  report: Report;
  analysis: Analysis;
  sel: string;
  setSel: (id: string) => void;
  tweaks: TweaksState;
  setTweak: (key: keyof TweaksState, val: string) => void;
}

const VeyraContext = createContext<VeyraContextValue | null>(null);

export function VeyraProvider({ children }: { children: React.ReactNode }) {
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

  const [reportId, setReportIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('vh.report') || VH_REPORTS[0].id;
    } catch {
      return VH_REPORTS[0].id;
    }
  });

  const [sel, setSel] = useState<string>('ferr');

  const report = useMemo(
    () => VH_REPORTS.find(r => r.id === reportId) || VH_REPORTS[0],
    [reportId]
  );

  const analysis = useMemo(() => vhAnalyze(report), [report]);

  const setReportId = (id: string) => {
    setReportIdState(id);
    try {
      localStorage.setItem('vh.report', id);
    } catch {}
    const r = VH_REPORTS.find(x => x.id === id) || VH_REPORTS[0];
    const flagged = r.measurements.find(m => vhFlag(m, r) !== 'normal');
    setSel(flagged ? flagged.id : r.measurements[0].id);
  };

  const setTweak = (key: keyof TweaksState, val: string) => {
    setTweaks(prev => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('vh.tweaks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  return (
    <VeyraContext.Provider
      value={{
        reportId,
        setReportId,
        report,
        analysis,
        sel,
        setSel,
        tweaks,
        setTweak,
      }}
    >
      {children}
    </VeyraContext.Provider>
  );
}

export function useVeyra() {
  const ctx = useContext(VeyraContext);
  if (!ctx) {
    throw new Error('useVeyra must be used within a VeyraProvider');
  }
  return ctx;
}

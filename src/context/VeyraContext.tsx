import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Report,
  Analysis,
  TweaksState,
  ApiReportAnalysis,
  ApiSimulationResult,
  Measurement,
  FlagType,
} from '../types';
import { VH_REPORTS, vhAnalyze } from '../data/vh-data';
import { api } from '../services/api';

export interface VeyraContextValue {
  reportId: string;
  setReportId: (id: string) => void;
  report: Report;
  analysis: Analysis;
  apiAnalysis: ApiReportAnalysis | null;
  availableReports: { id: string; title: string; sourceType: string }[];
  sel: string;
  setSel: (id: string) => void;
  tweaks: TweaksState;
  setTweak: (key: keyof TweaksState, val: string) => void;
  isLoading: boolean;
  error: string | null;
  isBackendConnected: boolean;
  runSimulation: (measurementId: string, value: number) => Promise<ApiSimulationResult>;
  refreshReport: () => Promise<void>;
}

const VeyraContext = createContext<VeyraContextValue | null>(null);

function mapApiToUiReport(apiData: ApiReportAnalysis, reportMeta?: { title?: string; id: string }): Report {
  const positions: [number, number][] = [
    [140, 100],
    [320, 120],
    [520, 100],
    [700, 130],
    [220, 260],
    [450, 270],
    [640, 310],
    [150, 420],
    [360, 430],
    [580, 450],
  ];

  const measurements: Measurement[] = apiData.measurements.map((m, idx) => {
    const low = m.referenceLow ?? 0;
    const high = m.referenceHigh ?? (m.value != null ? m.value * 2 : 100);
    const step = high - low > 20 ? 1 : 0.1;

    return {
      id: m.id,
      name: m.testName,
      raw: m.normalizedName,
      panel: 'Lab Panel',
      value: m.value,
      unit: m.unit,
      range: m.referenceLow != null || m.referenceHigh != null ? { low: m.referenceLow, high: m.referenceHigh } : null,
      conf: m.extractionConfidence >= 0.8 ? 'high' : 'low',
      line: idx + 1,
      src: m.sourceText,
      pos: positions[idx % positions.length],
      sim: [Math.max(0, Math.floor(low * 0.5)), Math.ceil(high * 1.5), step],
      note: m.evidence?.description || undefined,
      status: m.status as FlagType,
      evidence: m.evidence,
    };
  });

  return {
    id: apiData.reportId,
    title: reportMeta?.title || `Report ${apiData.reportId.slice(0, 8)}`,
    subtitle: `${apiData.sourceType.toUpperCase()} DATA · ${measurements.length} Measurements`,
    patient: `Subject (${apiData.sourceType}) · ${apiData.reportId.slice(0, 8)}`,
    collected: apiData.measurements[0]?.collectedAt || '2026-10-25',
    lab: 'Veyra Diagnostics API',
    source: `${apiData.sourceType}_report.json`,
    sourceType: apiData.sourceType,
    measurements,
    edges: [],
  };
}

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

  const [availableReports, setAvailableReports] = useState<{ id: string; title: string; sourceType: string }[]>(() =>
    VH_REPORTS.map(r => ({ id: r.id, title: r.title, sourceType: 'synthetic' }))
  );

  const [reportId, setReportIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('vh.report') || '11111111-1111-4111-8111-111111111111';
    } catch {
      return '11111111-1111-4111-8111-111111111111';
    }
  });

  const [apiAnalysis, setApiAnalysis] = useState<ApiReportAnalysis | null>(null);
  const [currentReport, setCurrentReport] = useState<Report>(VH_REPORTS[0]);
  const [sel, setSel] = useState<string>('11111111-aaaa-4111-8111-111111111111');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // 1. Load available reports list from API
  const loadReports = useCallback(async () => {
    try {
      const apiReports = await api.getReports();
      if (Array.isArray(apiReports) && apiReports.length > 0) {
        setAvailableReports(apiReports);
        setIsBackendConnected(true);
        // If current reportId is not in the list, set to first
        if (!apiReports.some(r => r.id === reportId)) {
          setReportIdState(apiReports[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Backend connection warning; using fallback dataset:', err);
      setIsBackendConnected(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // 2. Load report analysis when reportId changes
  const loadReportAnalysis = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getReportAnalysis(id);
      setApiAnalysis(data);
      const meta = availableReports.find(r => r.id === id);
      const mappedReport = mapApiToUiReport(data, meta);
      setCurrentReport(mappedReport);
      setIsBackendConnected(true);

      if (mappedReport.measurements.length > 0) {
        setSel(mappedReport.measurements[0].id);
      }
    } catch (err: any) {
      console.warn(`Failed to fetch report ${id} from API, falling back to local demo:`, err);
      setError(err.message || 'Failed to load report from API');
      setIsBackendConnected(false);

      // Graceful fallback to static reports
      const local = VH_REPORTS.find(r => r.id === id) || VH_REPORTS[0];
      setCurrentReport(local);
      if (local.measurements.length > 0) {
        setSel(local.measurements[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [availableReports]);

  useEffect(() => {
    loadReportAnalysis(reportId);
  }, [reportId, loadReportAnalysis]);

  const setReportId = (id: string) => {
    setReportIdState(id);
    try {
      localStorage.setItem('vh.report', id);
    } catch {}
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

  // Derive analysis flags
  const analysis = useMemo<Analysis>(() => {
    if (apiAnalysis) {
      const flags: Record<string, FlagType> = {};
      apiAnalysis.measurements.forEach(m => {
        flags[m.id] = m.status;
      });
      return { flags, active: {} };
    }
    return vhAnalyze(currentReport);
  }, [apiAnalysis, currentReport]);

  const runSimulation = async (measurementId: string, value: number): Promise<ApiSimulationResult> => {
    return api.runSimulation(reportId, measurementId, value);
  };

  const refreshReport = async () => {
    await loadReportAnalysis(reportId);
  };

  return (
    <VeyraContext.Provider
      value={{
        reportId,
        setReportId,
        report: currentReport,
        analysis,
        apiAnalysis,
        availableReports,
        sel,
        setSel,
        tweaks,
        setTweak,
        isLoading,
        error,
        isBackendConnected,
        runSimulation,
        refreshReport,
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

import type { ApiReportListItem, ApiReportAnalysis, ApiSimulationResult } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://e778-2401-4900-b7ce-90e8-a9d0-4ab0-8f7b-fef.ngrok-free.app/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.code) {
        errMessage = errJson.error.code;
      } else if (errJson.message) {
        errMessage = errJson.message;
      }
    } catch {}
    throw new Error(errMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  checkHealth: () => request<{ status: string; database: string }>('/health'),

  getReports: () => request<ApiReportListItem[]>('/v1/reports'),

  getReportAnalysis: (reportId: string) =>
    request<ApiReportAnalysis>(`/v1/reports/${reportId}/analysis`),

  runSimulation: (reportId: string, measurementId: string, value: number) =>
    request<ApiSimulationResult>(`/v1/reports/${reportId}/simulations`, {
      method: 'POST',
      body: JSON.stringify({ measurementId, value }),
    }),

  getAuthMe: () => request<{ user: { id: string; email: string } }>('/v1/auth/me'),

  login: (email: string, password: string) =>
    request('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/v1/auth/logout', {
      method: 'POST',
    }),
};

import type { ApiReportListItem, ApiReportAnalysis, ApiSimulationResult } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  session: {
    id: string;
    expiresAt: string;
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const send = () => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(options.headers as Record<string, string> || {}),
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  let response = await send();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isAuthenticationAttempt =
    /^\/v1\/auth\/(login|register|refresh|google)(?:[/?]|$)/.test(normalizedPath);

  if (response.status === 401 && !isAuthenticationAttempt) {
    const refreshResponse = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      credentials: 'include',
    });
    if (refreshResponse.ok) {
      response = await send();
    }
  }

  if (!response.ok) {
    let errMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson: unknown = await response.json();
      if (typeof errJson === 'object' && errJson !== null && 'error' in errJson) {
        const apiError = errJson.error;
        if (
          typeof apiError === 'object' &&
          apiError !== null &&
          'code' in apiError &&
          typeof apiError.code === 'string'
        ) {
          errMessage = apiError.code;
        } else if (
          typeof apiError === 'object' &&
          apiError !== null &&
          'message' in apiError &&
          typeof apiError.message === 'string'
        ) {
          errMessage = apiError.message;
        }
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
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

  getAuthMe: () => request<{ user: AuthUser }>('/v1/auth/me'),

  login: (email: string, password: string) =>
    request<AuthSessionResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<AuthSessionResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/v1/auth/logout', {
      method: 'POST',
    }),

  googleLogin: () =>
    request<{ authorizationUrl: string }>('/v1/auth/google?format=json'),
};

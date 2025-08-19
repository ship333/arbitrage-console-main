// Environment knobs for realtime behavior with safe defaults
// Values can be overridden via Vite env (VITE_*).

const toInt = (v: string | undefined, d: number): number => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : d;
};

const env = (import.meta as any)?.env || {};

export const WS_PING_MS = toInt(env.VITE_WS_PING_MS, 20000);
export const WS_PONG_TIMEOUT_MS = toInt(env.VITE_WS_PONG_TIMEOUT_MS, 10000);
export const WS_BACKOFF_BASE_MS = toInt(env.VITE_WS_BACKOFF_BASE_MS, 500);
export const WS_BACKOFF_MAX_MS = toInt(env.VITE_WS_BACKOFF_MAX_MS, 30000);
export const DEBUG_WS = String(env.VITE_DEBUG_WS || '') === '1';
export const DISABLE_WS = String(env.VITE_DISABLE_WS || '') === '1';
export const REQUIRE_AUTH = String(env.VITE_REQUIRE_AUTH || '') === '1';
export const WS_BADGE_DISCONNECT_SECS = toInt(env.VITE_WS_BADGE_DISCONNECT_SECS, 10);

// Centralized base URL helpers
export function getApiBaseUrl(): string {
  // Prefer explicit API URL; fall back to Vite dev proxy at /api
  const base = env.VITE_API_URL as string | undefined;
  if (base && /^https?:\/\//i.test(base)) {
    // If an absolute URL is provided and it ends with '/api', normalize to '/api/v1'
    // so it matches the backend mount prefix and avoids 404s when bypassing the dev proxy.
    try {
      const u = new URL(base);
      const path = u.pathname.replace(/\/$/, '');
      // If no path or root, default to '/api/v1'
      if (path === '' || path === '/') {
        u.pathname = '/api/v1';
        return u.toString().replace(/\/$/, '');
      }
      // If '/api', normalize to '/api/v1'
      if (/^\/api$/i.test(path)) {
        u.pathname = '/api/v1';
        return u.toString().replace(/\/$/, '');
      }
      // If already '/api/v*', keep as-is
      if (/^\/api\/v\d+/i.test(path)) {
        return base.replace(/\/$/, '');
      }
      return base.replace(/\/$/, '');
    } catch {
      return base;
    }
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return 'http://localhost:3000/api';
}

export function getWsBaseUrl(): string {
  // If explicit WS URL provided, use as-is
  const ws = env.VITE_WS_URL as string | undefined;
  if (ws && /^wss?:\/\//i.test(ws)) return ws;
  // Derive from API URL if present
  const api = env.VITE_API_URL as string | undefined;
  if (api) {
    try {
      const u = new URL(api);
      const scheme = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${scheme}//${u.host}`;
    } catch {
      // ignore and fall through
    }
  }
  // Fallback to current host
  if (typeof window !== 'undefined') {
    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${window.location.host}`;
  }
  return 'ws://localhost:3000';
}

// Build a full WebSocket URL by appending a path to the WS base
export function getWsUrl(path: string = '/ws'): string {
  const base = getWsBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

// Optional hint for transport libs (not used in browser runtime but kept for parity)
export const STREAM_HTTP2_DISABLE = String(env.VITE_STREAM_HTTP2_DISABLE || '') === 'true';

export type ConnectionState = 'connecting' | 'live' | 'degraded' | 'backoff';

export const now = () => Date.now();

// Minimal diagnostics counters (singleton)
export interface RealtimeCountersShape {
  ws: {
    reconnects: number;
    partialFrames: number;
    pingTimeouts: number;
    dropped: number;
  };
  sse: {
    reconnects: number;
  };
  fallback: {
    pollingActive: boolean;
    pollingActivations: number;
  };
}

export const RealtimeCounters: RealtimeCountersShape = {
  ws: { reconnects: 0, partialFrames: 0, pingTimeouts: 0, dropped: 0 },
  sse: { reconnects: 0 },
  fallback: { pollingActive: false, pollingActivations: 0 },
};

export const setPollingActive = (active: boolean) => {
  if (RealtimeCounters.fallback.pollingActive !== active) {
    RealtimeCounters.fallback.pollingActive = active;
    if (active) RealtimeCounters.fallback.pollingActivations += 1;
  }
};

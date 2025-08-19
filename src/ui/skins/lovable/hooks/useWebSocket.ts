import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_PING_MS, WS_PONG_TIMEOUT_MS, WS_BACKOFF_BASE_MS, WS_BACKOFF_MAX_MS, RealtimeCounters, type ConnectionState, now, getWsUrl, DEBUG_WS, DISABLE_WS, REQUIRE_AUTH } from '@/lib/env';

type WebSocketMessage = { type: string; data?: unknown; [k: string]: unknown };

type WebSocketCallbacks = {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
};

export function useWebSocket(callbacks: WebSocketCallbacks, topic: string = 'market') {
  // Disable real WebSocket usage when configured (e.g., in Playwright tests)
  if (DISABLE_WS) {
    return {
      sendMessage: () => false,
      reconnect: () => {},
      connectionState: 'degraded' as ConnectionState,
      stats: {
        bytesPerMin: 0,
        connectedAt: null,
        lastLiveAt: null,
        lastDisconnectAt: null,
      },
    };
  }
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<number>();
  const pingTimer = useRef<number>();
  const pongTimer = useRef<number>();
  const bufferRef = useRef('');
  const lastSubscribeRef = useRef<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const totalBytesRef = useRef(0);
  const windowStartRef = useRef<number>(now());
  const debugBytesTimer = useRef<number>();
  const [bytesPerMin, setBytesPerMin] = useState(0);
  const connectedAtRef = useRef<number | null>(null);
  const lastLiveAtRef = useRef<number | null>(null);
  const lastDisconnectAtRef = useRef<number | null>(null);

  const dlog = (...args: unknown[]) => {
    if (DEBUG_WS) {
      // eslint-disable-next-line no-console
      console.info('[WS]', ...args);
    }
  };

  // Resolve WS token (env override wins; then localStorage)
  const viteEnv: any = (import.meta as any)?.env || {};
  const resolveWsToken = () => {
    const t = (viteEnv.VITE_WS_TOKEN as string) || (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
    return t || null;
  };

  const clearTimers = () => {
    if (pingTimer.current) window.clearInterval(pingTimer.current);
    if (pongTimer.current) window.clearTimeout(pongTimer.current);
    if (reconnectTimeout.current) window.clearTimeout(reconnectTimeout.current);
    if (debugBytesTimer.current) window.clearInterval(debugBytesTimer.current);
  };

  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttempts.current;
    const base = WS_BACKOFF_BASE_MS;
    const delay = Math.min(WS_BACKOFF_MAX_MS, Math.floor(base * Math.pow(2, attempt)));
    const jitter = Math.floor(Math.random() * Math.min(250, delay));
    const wait = Math.max(base, delay + jitter);
    RealtimeCounters.ws.reconnects += 1;
    reconnectAttempts.current = attempt + 1;
    setConnectionState('backoff');
    dlog('reconnect scheduled', { topic, attempt, waitMs: wait });
    reconnectTimeout.current = window.setTimeout(() => connect(), wait);
  }, []);

  const sendPing = useCallback(() => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    try {
      const payload = JSON.stringify({ type: 'ping', ts: now() });
      ws.current.send(payload);
      if (pongTimer.current) window.clearTimeout(pongTimer.current);
      pongTimer.current = window.setTimeout(() => {
        // Missed pong
        RealtimeCounters.ws.pingTimeouts += 1;
        dlog('ping-timeout', { topic });
        try { ws.current?.close(4000, 'ping-timeout'); } catch {}
      }, WS_PONG_TIMEOUT_MS);
    } catch {
      // ignore
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (pingTimer.current) window.clearInterval(pingTimer.current);
    sendPing();
    pingTimer.current = window.setInterval(sendPing, WS_PING_MS);
  }, [sendPing]);

  const handleOpen = useCallback((event: Event) => {
    reconnectAttempts.current = 0;
    setConnectionState('live');
    connectedAtRef.current = now();
    lastLiveAtRef.current = connectedAtRef.current;
    dlog('open', { topic });
    callbacks.onOpen?.(event);
    // replay last subscribe
    if (lastSubscribeRef.current) {
      try { ws.current?.send(JSON.stringify(lastSubscribeRef.current)); } catch {}
    }
    startHeartbeat();
  }, [callbacks, startHeartbeat]);

  const handleClose = useCallback((event: CloseEvent) => {
    callbacks.onClose?.(event);
    clearTimers();
    setConnectionState('connecting');
    lastDisconnectAtRef.current = now();
    dlog('close', { topic, code: event.code, reason: event.reason });
    scheduleReconnect();
  }, [callbacks, scheduleReconnect]);

  const handleError = useCallback((event: Event) => {
    dlog('error', { topic, event });
    callbacks.onError?.(event);
  }, [callbacks]);

  const handleMessage = useCallback((event: MessageEvent<string>) => {
    // Any message is liveness; clear pending pong timeout if this is a pong
    try {
      bufferRef.current += event.data;
      totalBytesRef.current += (typeof event.data === 'string' ? event.data.length : 0);
      let parsed: WebSocketMessage | null = null;
      try {
        parsed = JSON.parse(bufferRef.current);
        bufferRef.current = '';
      } catch (e: unknown) {
        const msg = String(e instanceof Error ? e.message : e);
        // Likely a partial frame if JSON ends unexpectedly
        if (/end of JSON input|Unexpected end/i.test(msg)) {
          RealtimeCounters.ws.partialFrames += 1;
          return; // wait for more data
        } else {
          // Corrupted frame, drop buffer
          RealtimeCounters.ws.dropped += 1;
          bufferRef.current = '';
          return;
        }
      }

      if (parsed) {
        // Treat any message as liveness; clear pending pong timeout
        if (pongTimer.current) window.clearTimeout(pongTimer.current);
        setConnectionState('live');
        lastLiveAtRef.current = now();
        callbacks.onMessage?.(parsed);
      }
    } catch (err) {
      // swallow parsing errors to avoid crashing app
    }
  }, [callbacks]);

  const connect = useCallback(() => {
    try {
      if (ws.current) {
        try { ws.current.close(); } catch {}
      }
      clearTimers();
      setConnectionState('connecting');
      let wsUrl = getWsUrl(`/api/ws?topic=${encodeURIComponent(topic)}`);
      // Append token when auth is required
      try {
        const u = new URL(wsUrl);
        if (REQUIRE_AUTH) {
          const token = resolveWsToken();
          if (token) {
            u.searchParams.set('token', token);
          }
        }
        wsUrl = u.toString();
      } catch {}
      dlog('connecting', { topic, url: wsUrl });
      ws.current = new WebSocket(wsUrl);
      ws.current.onopen = handleOpen;
      ws.current.onclose = handleClose;
      ws.current.onerror = handleError;
      ws.current.onmessage = handleMessage as any;

      if (DEBUG_WS) {
        // Log bytes/minute every 60s; reset window after logging
        windowStartRef.current = now();
        totalBytesRef.current = 0;
        debugBytesTimer.current = window.setInterval(() => {
          const elapsedMin = Math.max(1 / 60, (now() - windowStartRef.current) / 60000);
          const rate = Math.round(totalBytesRef.current / elapsedMin);
          setBytesPerMin(rate);
          dlog('throughput', { topic, bytesPerMin: rate });
          windowStartRef.current = now();
          totalBytesRef.current = 0;
        }, 60000);
      }
    } catch {
      scheduleReconnect();
    }
  }, [handleClose, handleError, handleMessage, handleOpen, scheduleReconnect, topic]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (message?.type === 'subscribe') {
      lastSubscribeRef.current = message;
    }
    if (ws.current?.readyState === WebSocket.OPEN) {
      try { ws.current.send(JSON.stringify(message)); return true; } catch { return false; }
    }
    return false;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      try { ws.current?.close(); } catch {}
      clearTimers();
    };
  }, [connect]);

  return {
    sendMessage,
    reconnect: connect,
    connectionState,
    stats: {
      bytesPerMin,
      connectedAt: connectedAtRef.current,
      lastLiveAt: lastLiveAtRef.current,
      lastDisconnectAt: lastDisconnectAtRef.current,
    },
  };
}

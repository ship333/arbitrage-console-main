import React, { useMemo } from 'react';
import { DEBUG_WS, WS_BADGE_DISCONNECT_SECS } from '@/lib/env';
import { useWebSocket } from '@/ui/skins/lovable/hooks/useWebSocket';

/**
 * WSStatusBadge
 * Minimal opt-in badge showing WebSocket health. Treeshakeable: returns null when DEBUG_WS is false.
 * Uses a lightweight subscription to the `status` topic for health monitoring only when VITE_DEBUG_WS=1.
 */
export function WSStatusBadge() {
  if (!DEBUG_WS) return null;

  const { connectionState, stats } = useWebSocket({}, 'status');

  const { color, label, sub } = useMemo(() => {
    const lastLiveAt = stats.lastLiveAt ?? 0;
    const lastDisconnectAt = stats.lastDisconnectAt ?? 0;
    const now = Date.now();
    const secondsSinceLive = lastLiveAt ? Math.floor((now - lastLiveAt) / 1000) : Infinity;
    const secondsSinceDisconnect = lastDisconnectAt ? Math.floor((now - lastDisconnectAt) / 1000) : 0;

    const unhealthy =
      connectionState !== 'live' ||
      secondsSinceLive > WS_BADGE_DISCONNECT_SECS;

    const color = unhealthy ? '#ef4444' /* red-500 */ : '#22c55e' /* green-500 */;
    const label = unhealthy ? 'WS Disconnected' : 'WS Healthy';
    const sub = unhealthy
      ? `for ${secondsSinceDisconnect || secondsSinceLive}s`
      : `${stats.bytesPerMin} B/min`;

    return { color, label, sub };
  }, [connectionState, stats.bytesPerMin, stats.lastDisconnectAt, stats.lastLiveAt]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        top: 12,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(17, 24, 39, 0.8)', // gray-900/80
        color: 'white',
        padding: '6px 10px',
        borderRadius: 999,
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        fontSize: 12,
        lineHeight: 1.1,
        WebkitUserSelect: 'none',
        userSelect: 'none',
        cursor: 'pointer',
      }}
      onClick={() => {
        // Quick inspection logger for devs
        // eslint-disable-next-line no-console
        console.info('[WS badge click]', { connectionState, stats });
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
        }}
        aria-label="ws-health-indicator"
      />
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ opacity: 0.8 }}>• {sub}</span>
    </div>
  );
}

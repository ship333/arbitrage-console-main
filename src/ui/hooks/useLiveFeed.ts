import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { APPROVED_PAIRS } from '@/config/assets';
import api from '@/lib/api';
import { getWsUrl, setPollingActive, DISABLE_WS } from '@/lib/env';

interface LiveFeedData {
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  spreads: Record<string, number>; // bps
  liquidity: Record<string, number>; // USD
  lastUpdated: string;
  opportunities: Array<{
    pair: string;
    edgeBps: number;
    size: number;
    venue: string;
  }>;
}

export function useLiveFeed() {
  const queryClient = useQueryClient();
  const [isWsConnected, setIsWsConnected] = useState(false);
  const lastWsLiveAtRef = useRef<number>(Date.now());
  const degradedNotifiedRef = useRef(false);
  const pollingTimerRef = useRef<number>();

  // Initial data fetch with polling fallback
  const { data, error, isLoading } = useQuery<LiveFeedData>({
    queryKey: ['liveFeed'],
    queryFn: async () => {
      const res = await api.getMetrics();
      return res.data as LiveFeedData;
    },
    refetchInterval: 1000, // 1s polling as fallback
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Feature flag: allow disabling WS (e.g., tests or early staging)
    if (DISABLE_WS) {
      return; // rely on query polling only
    }
    // Use unified FastAPI WS route with topic multiplexing
    const wsUrl = getWsUrl('/api/ws?topic=market');

    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsWsConnected(true);
      lastWsLiveAtRef.current = Date.now();
      // stop any polling
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = undefined;
        setPollingActive(false);
      }
      degradedNotifiedRef.current = false;
      // Subscribe to relevant channels
      ws.send(JSON.stringify({
        type: 'subscribe',
        pairs: [...APPROVED_PAIRS],
        metrics: ['latency', 'spreads', 'liquidity', 'opportunities']
      }));
    };

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        lastWsLiveAtRef.current = Date.now();
        // Optimistically update the cache
        queryClient.setQueryData<LiveFeedData>(['liveFeed'], (old) => ({
          ...old!,
          ...update,
          lastUpdated: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Failed to process WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [queryClient]);

  // Degrade to HTTP polling if WS not live for >5s; resume when WS healthy
  useEffect(() => {
    // When WS is disabled, don't start additional manual polling
    if (DISABLE_WS) return;
    const healthCheck = window.setInterval(async () => {
      const since = Date.now() - lastWsLiveAtRef.current;
      const wsHealthy = isWsConnected && since <= 5000;
      if (!wsHealthy && !pollingTimerRef.current) {
        // start polling each 2s
        pollingTimerRef.current = window.setInterval(async () => {
          try {
            const res = await api.getMetrics();
            const payload: LiveFeedData = res.data as LiveFeedData;
            queryClient.setQueryData<LiveFeedData>(['liveFeed'], (old) => ({
              ...old!,
              ...payload,
              lastUpdated: new Date().toISOString(),
            }));
          } catch {
            // swallow network issues
          }
        }, 2000);
        setPollingActive(true);
        if (!degradedNotifiedRef.current) {
          toast({ title: 'Realtime degraded', description: 'Using HTTP polling until WS recovers.' });
          degradedNotifiedRef.current = true;
        }
      }
      if (wsHealthy && pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = undefined;
        setPollingActive(false);
      }
    }, 1000);
    return () => {
      window.clearInterval(healthCheck);
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = undefined;
        setPollingActive(false);
      }
    };
  }, [isWsConnected, queryClient]);

  return {
    data,
    isLoading,
    error,
    isWsConnected,
  };
}

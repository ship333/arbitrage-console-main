import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BotStatus, 
  Strategy, 
  Trade, 
  LogEntry, 
  botApi, 
  strategyApi, 
  activityApi, 
  logsApi,
  tradingApi,
  arbApi,
  RiskLimits,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, StopCircle, Save, RefreshCw, AlertCircle, Activity, TrendingUp, DollarSign, Layers } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/DataTable';
import { columns as tradeColumns } from './TradeColumns';
import { arrayify } from '@/lib/arrayify';

const REFETCH_INTERVAL = 5000; // 5 seconds

export function BotControlPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Bot Status Query
  const { data: status, isLoading: isLoadingStatus, error: statusError } = useQuery<BotStatus>({
    queryKey: ['bot', 'status'],
    queryFn: async () => (await botApi.getStatus()).data,
    refetchInterval: REFETCH_INTERVAL,
  });
  
  // Kill switch state
  const { data: killSwitchData, isLoading: isLoadingKill } = useQuery<{ enabled: boolean}>({
    queryKey: ['bot', 'kill-switch'],
    queryFn: async () => (await botApi.getKillSwitch()).data,
    refetchInterval: REFETCH_INTERVAL,
  });
  const killEnabled = !!killSwitchData?.enabled;
  
  
  // Strategies Query
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery<Strategy[]>({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await strategyApi.list();
      const data = (res as any).data;
      return Array.isArray(data) ? data : [];
    },
  });
  
  // Recent Trades Query
  const { data: recentTrades = [], isLoading: isLoadingTrades } = useQuery<Trade[]>({
    queryKey: ['trades', 'recent'],
    queryFn: async () => {
      try {
        const data = await activityApi.getTrades(10);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  // Determine primary pair for backtest fetch (fallback to BTC-USD)
  const primaryPair = (Array.isArray(recentTrades) && (recentTrades as any[])[0]?.pair)
    ? String((recentTrades as any[])[0].pair)
    : 'BTC-USD';

  // Backtest Trades Query (by pair) to merge into Recent Trades
  const { data: backtestTrades = [] } = useQuery<Trade[]>({
    queryKey: ['trades', 'backtest', primaryPair],
    queryFn: async () => {
      try {
        const data = await arbApi.getBacktestTradesForPair(primaryPair, 10);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!primaryPair,
    refetchInterval: REFETCH_INTERVAL,
  });
  
  // Live SSE subscription to enrich Recent Trades in real time
  useEffect(() => {
    const unsubscribe = activityApi.subscribeToTrades((trade: Trade) => {
      queryClient.setQueryData<Trade[]>(['trades', 'recent'], (prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const buildKey = (t: any, i: number) => `${t?.id ?? 'noid'}-${t?.timestamp ?? i}-${t?.pair ?? ''}-${t?.side ?? ''}`;
        const seen = new Set<string>();
        const next = [trade, ...arr].filter((t, i) => {
          const k = buildKey(t as any, i);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return next.slice(0, 10);
      });
    });
    return () => {
      try { unsubscribe(); } catch { /* no-op */ }
    };
  }, [queryClient]);
  
  // Logs Query
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<LogEntry[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      try {
        const data = await logsApi.getLogs({ limit: 50 });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: REFETCH_INTERVAL,
  });
  
  // Risk Limits Query
  const { data: riskLimits, isLoading: isLoadingRisk, error: riskError } = useQuery<RiskLimits>({
    queryKey: ['risk', 'limits'],
    queryFn: async () => {
      const res = await tradingApi.getRiskLimits();
      return (res as any).data as RiskLimits;
    },
    refetchInterval: REFETCH_INTERVAL,
  });
  
  // Safe arrays + dev warnings for bad shapes (strategies/logs/trades)
  const isDev = (() => {
    try {
      return typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.MODE !== 'production';
    } catch { return false; }
  })();
  if (isDev && strategies && !Array.isArray(strategies)) {
    // eslint-disable-next-line no-console
    console.warn('[bot-control] strategies expected array, received:', strategies);
  }
  if (isDev && logs && !Array.isArray(logs)) {
    // eslint-disable-next-line no-console
    console.warn('[bot-control] logs expected array, received:', logs);
  }
  if (isDev && recentTrades && !Array.isArray(recentTrades)) {
    // eslint-disable-next-line no-console
    console.warn('[bot-control] trades expected array, received:', recentTrades);
  }
  const safeStrategies = arrayify<Strategy>(strategies as unknown);
  const safeTrades = arrayify<Trade>(recentTrades as unknown);
  const safeBacktestTrades = arrayify<Trade>(backtestTrades as unknown);

  // Merge, sort by timestamp desc, dedupe by composite key, cap to 10
  const mergedTrades: Trade[] = (() => {
    const buildKey = (t: any, i: number) => `${t?.id ?? 'noid'}-${t?.timestamp ?? i}-${t?.pair ?? ''}-${t?.side ?? ''}`;
    const seen = new Set<string>();
    const combined = [...safeTrades, ...safeBacktestTrades];
    combined.sort((a, b) => {
      const ta = new Date(a?.timestamp || 0).getTime();
      const tb = new Date(b?.timestamp || 0).getTime();
      return tb - ta;
    });
    const out: Trade[] = [];
    for (let i = 0; i < combined.length; i++) {
      const t = combined[i] as any;
      const k = buildKey(t, i);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t as Trade);
      if (out.length >= 10) break;
    }
    return out;
  })();
  const safeLogs = arrayify<LogEntry>(logs as unknown);
  
  // Mutations
  const startBot = useMutation({
    mutationFn: (strategyId: string) => botApi.start(strategyId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] });
      toast({
        title: 'Success',
        description: 'Bot started successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const stopBot = useMutation({
    mutationFn: () => botApi.stop(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] });
      toast({
        title: 'Success',
        description: 'Bot stopped successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const updateConfig = useMutation({
    mutationFn: (config: Partial<BotStatus>) => botApi.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] });
      toast({
        title: 'Success',
        description: 'Configuration updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Kill switch toggle
  const toggleKillSwitch = useMutation({
    mutationFn: (enabled: boolean) => botApi.setKillSwitch(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot', 'kill-switch'] });
      queryClient.invalidateQueries({ queryKey: ['bot', 'status'] });
      toast({ title: 'Kill switch', description: 'Updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message || 'Failed to update kill switch', variant: 'destructive' });
    },
  });
  
  // Save risk limits
  const saveRiskLimits = useMutation({
    mutationFn: (limits: RiskLimits) => tradingApi.updateRiskLimits(limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk', 'limits'] });
      toast({ title: 'Risk limits', description: 'Saved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message || 'Failed to save risk limits', variant: 'destructive' });
    },
  });
  
  // Local state
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [config, setConfig] = useState<Partial<BotStatus>>({
    tradingEnabled: true,
    maxPositionSize: 1000,
    stopLoss: 2.5,
    takeProfit: 5.0,
  });
  const [limits, setLimits] = useState<RiskLimits>({
    maxNotionalPerTradeUsd: 1000,
    maxOpenPositions: 5,
    maxDailyPnlDrawdownUsd: 500,
    maxSlippageBps: 50,
    minOrderbookLiquidityUsd: 10000,
  });
  
  // Update local config when status changes
  useEffect(() => {
    if (status) {
      setConfig(prev => ({
        ...prev,
        ...status,
      }));
      
      if (status.currentStrategy) {
        setSelectedStrategy(status.currentStrategy);
      }
    }
  }, [status]);
  
  useEffect(() => {
    if (riskLimits && typeof riskLimits === 'object') {
      setLimits(riskLimits);
    }
  }, [riskLimits]);
  
  // Handle start/stop bot
  const handleToggleBot = async () => {
    if (status?.isRunning) {
      await stopBot.mutateAsync();
    } else if (selectedStrategy) {
      await startBot.mutateAsync(selectedStrategy);
    } else {
      toast({
        title: 'Error',
        description: 'Please select a strategy',
        variant: 'destructive',
      });
    }
  };
  
  // Handle config update
  const handleConfigUpdate = async () => {
    await updateConfig.mutateAsync(config);
  };
  
  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Note: Do not block initial render on loading; render UI with inline loaders instead.
  
  
  return (
    <div className="space-y-6">
      {/* Bot Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Control</CardTitle>
          <CardDescription>
            {status?.isRunning 
              ? 'Bot is currently running' 
              : 'Bot is currently stopped'}
          </CardDescription>
          {killEnabled && (
            <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              Emergency kill switch is ENABLED. Starting is blocked until disabled.
            </div>
          )}
          {statusError && (
            <div className="mt-2 flex items-center text-sm text-red-500">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>
                Failed to load bot status: {(statusError as any)?.message ?? 'Unknown error'}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select 
                value={selectedStrategy} 
                onValueChange={setSelectedStrategy}
                disabled={status?.isRunning}
              >
                <SelectTrigger data-testid="strategy-select">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {safeStrategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id} data-testid={`strategy-item-${strategy.id}`}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${status?.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                <span data-testid="status-text">{status?.isRunning ? 'Running' : 'Stopped'}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="killSwitch">Emergency Kill Switch</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="killSwitch"
                  checked={killEnabled}
                  onCheckedChange={(checked) => toggleKillSwitch.mutate(!!checked)}
                  disabled={isLoadingKill || toggleKillSwitch.isPending}
                />
                <span className={killEnabled ? 'text-red-600 font-semibold' : 'text-green-600'}>
                  {killEnabled ? 'Enabled (trading blocked)' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tradingEnabled">Trading Enabled</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="tradingEnabled" 
                  checked={!!config.tradingEnabled} 
                  onCheckedChange={(checked) => handleInputChange('tradingEnabled', checked)}
                />
                <span>{!!config.tradingEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxPositionSize">Max Position Size (USD)</Label>
              <Input 
                id="maxPositionSize" 
                type="number" 
                value={config.maxPositionSize ?? 0}
                onChange={(e) => handleInputChange('maxPositionSize', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Current PnL</Label>
              <div className={`text-xl font-semibold ${
                (status?.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {status?.pnl?.toFixed(2)} USD ({status?.pnlPercentage?.toFixed(2)}%)
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss (%)</Label>
              <Input 
                id="stopLoss" 
                type="number" 
                step="0.1"
                value={config.stopLoss ?? 0}
                onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="takeProfit">Take Profit (%)</Label>
              <Input 
                id="takeProfit" 
                type="number" 
                step="0.1"
                value={config.takeProfit ?? 0}
                onChange={(e) => handleInputChange('takeProfit', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Risk Limits */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Risk Limits</Label>
                <p className="text-sm text-muted-foreground">Server-enforced trading guardrails</p>
              </div>
              {riskError && (
                <div className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Failed to load limits
                </div>
              )}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['risk', 'limits'] })}
                disabled={isLoadingRisk}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRisk ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxNotionalPerTradeUsd">Max Notional / Trade (USD)</Label>
                <Input 
                  id="maxNotionalPerTradeUsd"
                  type="number"
                  value={limits.maxNotionalPerTradeUsd ?? 0}
                  onChange={(e) => setLimits(prev => ({ ...prev, maxNotionalPerTradeUsd: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxOpenPositions">Max Open Positions</Label>
                <Input 
                  id="maxOpenPositions"
                  type="number"
                  value={limits.maxOpenPositions ?? 0}
                  onChange={(e) => setLimits(prev => ({ ...prev, maxOpenPositions: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDailyPnlDrawdownUsd">Max Daily PnL Drawdown (USD)</Label>
                <Input 
                  id="maxDailyPnlDrawdownUsd"
                  type="number"
                  value={limits.maxDailyPnlDrawdownUsd ?? 0}
                  onChange={(e) => setLimits(prev => ({ ...prev, maxDailyPnlDrawdownUsd: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSlippageBps">Max Slippage (bps)</Label>
                <Input 
                  id="maxSlippageBps"
                  type="number"
                  value={limits.maxSlippageBps ?? 0}
                  onChange={(e) => setLimits(prev => ({ ...prev, maxSlippageBps: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderbookLiquidityUsd">Min Orderbook Liquidity (USD)</Label>
                <Input 
                  id="minOrderbookLiquidityUsd"
                  type="number"
                  value={limits.minOrderbookLiquidityUsd ?? 0}
                  onChange={(e) => setLimits(prev => ({ ...prev, minOrderbookLiquidityUsd: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => saveRiskLimits.mutate(limits)}
                disabled={saveRiskLimits.isPending}
                data-testid="risk-save-limits"
              >
                {saveRiskLimits.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Risk Limits
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleConfigUpdate}
            disabled={updateConfig.isPending}
            data-testid="bot-save-config"
          >
            {updateConfig.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
          
          <Button 
            variant={status?.isRunning ? "destructive" : "default"}
            onClick={handleToggleBot}
            disabled={startBot.isPending || stopBot.isPending || killEnabled}
            data-testid={status?.isRunning ? 'bot-stop' : 'bot-start'}
          >
            {startBot.isPending || stopBot.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status?.isRunning ? 'Stopping...' : 'Starting...'}
              </>
            ) : (
              <>
                {status?.isRunning ? (
                  <>
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Bot
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Bot
                  </>
                )}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Tabs for additional information */}
      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Most recent trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrades ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : safeTrades.length > 0 ? (
                <DataTable 
                  columns={tradeColumns} 
                  data={mergedTrades} 
                  rowKey={(t, i) => {
                    const x = t as any;
                    const idPart = x?.id != null ? String(x.id) : 'noid';
                    const tsPart = x?.timestamp != null ? String(x.timestamp) : String(i);
                    const pairPart = x?.pair ? String(x.pair) : '';
                    const sidePart = x?.side ? String(x.side) : '';
                    return `${idPart}-${tsPart}-${pairPart}-${sidePart}`;
                  }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No trades found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Logs</CardTitle>
                  <CardDescription>System and trading logs</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })}
                  disabled={isLoadingLogs}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : safeLogs.length > 0 ? (
                  safeLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-2 rounded text-sm ${
                        log.level === 'error' ? 'bg-red-50 text-red-700' :
                        log.level === 'warn' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-muted/50'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="uppercase font-semibold">{log.level}</span>
                      </div>
                      <div className="mt-1">{log.message}</div>
                      {log.context && (
                        <div className="mt-1 text-xs opacity-75">
                          {JSON.stringify(log.context, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  title="Total Trades" 
                  value={status?.tradesCount?.toString() || '0'} 
                  icon={<Activity className="h-6 w-6 text-blue-500" />}
                />
                <MetricCard 
                  title="Win Rate" 
                  value={`${status?.winRate?.toFixed(2) || '0'}%`} 
                  icon={<TrendingUp className="h-6 w-6 text-green-500" />}
                />
                <MetricCard 
                  title="Total PnL" 
                  value={`${status?.pnl?.toFixed(2) || '0.00'} USD`} 
                  icon={<DollarSign className="h-6 w-6 text-purple-500" />}
                  isCurrency
                  isPositive={status?.pnl ? status.pnl >= 0 : false}
                />
                <MetricCard 
                  title="Active Positions" 
                  value={Object.keys(status?.assets || {}).length.toString()} 
                  icon={<Layers className="h-6 w-6 text-orange-500" />}
                />
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Performance Over Time</h3>
                <div className="h-64 bg-muted/50 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Performance chart will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function MetricCard({ 
  title, 
  value, 
  icon,
  isCurrency = false,
  isPositive = true
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  isCurrency?: boolean;
  isPositive?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className="h-6 w-6">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${
          isCurrency ? (isPositive ? 'text-green-600' : 'text-red-600') : ''
        }`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

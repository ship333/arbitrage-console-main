import { useEffect, useMemo, useState } from 'react';
import { 
  useStats, 
  useHealth, 
  useBotStatus, 
  useBacktestStatus, 
  useStartBot, 
  usePauseBot, 
  useStopBot, 
  useEmergencyStop 
} from '@/lib/queries';
import { formatUsd, formatTimeAgo, formatLatency } from '@/lib/formatters';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { StrategyPreset } from '@/lib/types';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Wifi,
  Play,
  Pause,
  Square,
  AlertTriangle,
  Settings
} from 'lucide-react';

export default function BotControl() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: botStatus, isLoading: botLoading } = useBotStatus();
  const { data: backtest, isLoading: backtestLoading } = useBacktestStatus();

  const startBot = useStartBot();
  const pauseBot = usePauseBot();
  const stopBot = useStopBot();
  const emergencyStop = useEmergencyStop();
  const { toast } = useToast();

  const [strategies, setStrategies] = useState<StrategyPreset[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('strategy-presets');
      if (saved) setStrategies(JSON.parse(saved));
    } catch {}
  }, []);
  const enabledStrategies = useMemo(
    () => strategies.filter(s => s.enabled).sort((a, b) => a.priority - b.priority),
    [strategies]
  );

  const isHealthy = health?.ok;
  const healthStatus = isHealthy ? 'healthy' : 'error';
  const botState = botStatus?.state ?? 'stopped';
  const canStart = !!isHealthy && (botState === 'stopped' || botState === 'paused');
  const canPause = !!isHealthy && botState === 'running';
  const canStop = !!isHealthy && (botState === 'running' || botState === 'paused');

  const handle = async (action: 'start' | 'pause' | 'stop' | 'emergency') => {
    try {
      if (action === 'start') await startBot.mutateAsync();
      if (action === 'pause') await pauseBot.mutateAsync();
      if (action === 'stop') await stopBot.mutateAsync();
      if (action === 'emergency') await emergencyStop.mutateAsync();
      toast({ title: 'Bot updated', description: `Action: ${action}` });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message ?? String(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bot Control</h1>
          <p className="text-muted-foreground">Monitor and control your arbitrage bot</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={healthStatus}>
            {isHealthy ? 'System Healthy' : 'System Error'}
          </StatusBadge>
          <StatusBadge status={botState === 'running' ? 'healthy' : botState === 'paused' ? 'pending' : 'error'}>
            {botLoading ? 'Loading…' : `Bot: ${botState}`}
          </StatusBadge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Active Signals"
          value={stats?.activeSignals ?? '—'}
          icon={<Activity className="h-4 w-4" />}
          isLoading={statsLoading}
        />
        <KPICard
          title="Recent Opportunities"
          value={stats?.recentOpportunities ?? '—'}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={statsLoading}
        />
        <KPICard
          title="Last Update"
          value={formatTimeAgo(stats?.updatedAt)}
          icon={<Clock className="h-4 w-4" />}
          isLoading={statsLoading}
        />
        <KPICard
          title="API Latency"
          value={formatLatency(health?.latencyMs)}
          status={health?.latencyMs ? (health.latencyMs < 100 ? 'profit' : 'loss') : 'neutral'}
          icon={<Wifi className="h-4 w-4" />}
          isLoading={healthLoading}
        />
      </div>

      {/* Bot Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Bot Controls</h2>
            <p className="text-sm text-muted-foreground">Control bot execution and trading</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-pending animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {botLoading ? 'Loading…' : `State: ${botState}`}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                disabled={!canStart || startBot.isPending}
                onClick={() => handle('start')}
                className="h-20 flex-col space-y-2"
              >
                <Play className="h-6 w-6" />
                <span>{startBot.isPending ? 'Starting…' : 'Start Bot'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canStart ? 'Start the bot' : 'Unavailable for current state'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                disabled={!canPause || pauseBot.isPending}
                onClick={() => handle('pause')}
                className="h-20 flex-col space-y-2"
              >
                <Pause className="h-6 w-6" />
                <span>{pauseBot.isPending ? 'Pausing…' : 'Pause Bot'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canPause ? 'Pause the bot' : 'Unavailable for current state'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                disabled={!canStop || stopBot.isPending}
                onClick={() => handle('stop')}
                className="h-20 flex-col space-y-2"
              >
                <Square className="h-6 w-6" />
                <span>{stopBot.isPending ? 'Stopping…' : 'Stop Bot'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canStop ? 'Stop the bot' : 'Unavailable for current state'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                disabled={emergencyStop.isPending}
                onClick={() => handle('emergency')}
                className="h-20 flex-col space-y-2"
              >
                <AlertTriangle className="h-6 w-6" />
                <span>{emergencyStop.isPending ? 'Stopping…' : 'Emergency Stop'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Immediately stop all activity</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </Card>

      {/* Backtest Progress and Health */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Backtest Progress</h3>
          </div>
          {backtestLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : backtest ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{backtest.currentStrategy ?? '—'}</span>
                <span>
                  {backtest.completed}/{backtest.total}
                  {backtest.etaSeconds ? ` • ETA ${Math.round(backtest.etaSeconds)}s` : ''}
                </span>
              </div>
              <Progress value={backtest.total ? (backtest.completed / backtest.total) * 100 : 0} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active backtest</div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Wifi className="h-5 w-5" />
            <h3 className="text-lg font-semibold">API Health</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={healthStatus}>
                {isHealthy ? 'Online' : 'Offline'}
              </StatusBadge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Response Time</span>
              <span className="text-sm">{formatLatency(health?.latencyMs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Check</span>
              <span className="text-sm">{formatTimeAgo(health?.timestamp)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Quick Settings</h3>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Trading: Monitor mode</p>
            <p>• Risk Level: Conservative</p>
            <p>• Max Position: $10,000</p>
            <p>• Gas Limit: 50 gwei</p>
          </div>
        </Card>
      </div>

      {/* Enabled Strategies */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Enabled Strategies</h3>
          <span className="text-sm text-muted-foreground">{enabledStrategies.length} enabled</span>
        </div>
        {enabledStrategies.length === 0 ? (
          <div className="text-sm text-muted-foreground">No enabled strategies. Configure in Activity ➜ Strategy Registry.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {enabledStrategies.map(s => (
              <span key={s.id} className="px-2 py-1 rounded-md bg-muted text-xs">
                {s.priority}. {s.name}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
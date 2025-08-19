import React, { Suspense, lazy, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
const BacktestsLineChart = lazy(() => import('@/components/charts/BacktestsLineChart').then(m => ({ default: m.BacktestsLineChart })));

const StrategiesTab = lazy(() => import('@/components/tabs/StrategiesTab').then(m => ({ default: m.StrategiesTab })));
const StrategyRegistry = lazy(() => import('@/components/StrategyRegistry').then(m => ({ default: m.StrategyRegistry })));

const StrategiesPage = () => {
  // Local state for Backtest Runner
  const [pair, setPair] = useState<string>('HYPE');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    id: string;
    pair: string;
    startTime: string;
    endTime: string;
    metrics: {
      expectedValue: number;
      realizedValue: number;
      slippage: number;
      winRate: number;
      totalTrades: number;
      profitFactor: number;
    };
    timeseries: Array<{ timestamp: string; ev: number; realized: number; slippage: number }>;
  }[] | null>(null);

  const runBacktest = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.arb.getBacktestsForPair(pair);
      setResults(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to run backtest');
      setResults(null);
    } finally {
      setIsRunning(false);
    }
  };

  const exportCsv = () => {
    if (!results || results.length === 0) return;
    const url = api.arb.getBacktestCsvUrl(results[0].id);
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Strategies</h1>
        <p className="text-sm text-muted-foreground">Monitor strategy metrics and manage local presets.</p>
      </div>

      {/* Backtest Runner */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Backtest Runner</h2>
        <div className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pair">Pair</Label>
              <Input id="pair" placeholder="e.g. HYPE/KHYPE" value={pair} onChange={(e) => setPair(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={runBacktest} disabled={isRunning || !pair.trim()}>
              {isRunning ? 'Running…' : 'Run Backtest'}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!results || results.length === 0}>Export CSV</Button>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">{error}</div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          {isRunning && <Skeleton className="h-64 w-full" />}
          {!isRunning && results && results.length > 0 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Expected Value" value={`$${results[0].metrics.expectedValue.toFixed(2)}`} />
                <MetricCard title="Realized Value" value={`$${results[0].metrics.realizedValue.toFixed(2)}`} />
                <MetricCard title="Slippage" value={`${results[0].metrics.slippage.toFixed(2)}%`} />
                <MetricCard title="Win Rate" value={`${(results[0].metrics.winRate * 100).toFixed(1)}%`} />
              </div>

              <Suspense fallback={<Skeleton className="h-80 w-full" />}> 
                <BacktestsLineChart data={results[0].timeseries} />
              </Suspense>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Strategy Metrics</h2>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}> 
          <StrategiesTab />
        </Suspense>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Registry</h2>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}> 
          <StrategyRegistry />
        </Suspense>
      </section>
    </div>
  );
};

export default StrategiesPage;

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

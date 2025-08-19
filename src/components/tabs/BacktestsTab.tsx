import { useBacktests, downloadBacktestCsv } from '@/ui/hooks/useBacktests';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
const BacktestsLineChart = lazy(() => import('@/components/charts/BacktestsLineChart').then(m => ({ default: m.BacktestsLineChart })));

export function BacktestsTab() {
  const { data: backtests, isLoading } = useBacktests();

  if (isLoading || !backtests) {
    return <Skeleton className="h-64 w-full" />;
  }

  const pairs = Object.entries(backtests);

  return (
    <div className="space-y-8">
      {pairs.map(([pair, results]) => (
        <div key={pair} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{pair} Backtests</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadBacktestCsv(pair)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          
          {results.length > 0 ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                  title="Expected Value" 
                  value={`$${results[0].metrics.expectedValue.toFixed(2)}`}
                />
                <MetricCard 
                  title="Realized Value" 
                  value={`$${results[0].metrics.realizedValue.toFixed(2)}`}
                />
                <MetricCard 
                  title="Slippage" 
                  value={`${results[0].metrics.slippage.toFixed(2)}%`}
                />
                <MetricCard 
                  title="Win Rate" 
                  value={`${(results[0].metrics.winRate * 100).toFixed(1)}%`}
                />
              </div>

              <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                <BacktestsLineChart data={results[0].timeseries} />
              </Suspense>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No backtest data available for {pair}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

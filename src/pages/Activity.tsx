import React, { useState, Suspense, lazy } from 'react';
import { useRecentOpportunities, useActiveSignals } from '@/lib/queries';
import { useLiveFeed } from '@/ui/hooks/useLiveFeed';
import { formatUsd, formatPercent, formatTimeAgo, getProfitColor } from '@/lib/formatters';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { EvaluationForm } from '@/components/EvaluationForm';
import { StrategyRegistry } from '@/components/StrategyRegistry';
const BacktestVisualization = lazy(() => import('@/components/BacktestVisualization').then(m => ({ default: m.BacktestVisualization })));
import { ParameterSweep } from '@/components/ParameterSweep';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { ArbitrageOpportunity, Signal } from '@/lib/types';
import { TrendingUp, TrendingDown, Eye, Code } from 'lucide-react';

export default function Activity() {
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showJson, setShowJson] = useState(false);

  const { data: opportunities = [], isLoading: opportunitiesLoading } = useRecentOpportunities();
  const { data: signals = [], isLoading: signalsLoading } = useActiveSignals();
  const { data: live, isWsConnected } = useLiveFeed();

  const opportunityColumns = [
    {
      key: 'type',
      title: 'Type',
      render: (value: string) => (
        <Badge variant="outline" className="font-mono">
          {value}
        </Badge>
      ),
    },
    {
      key: 'path',
      title: 'Path',
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      key: 'netProfitUsd',
      title: 'Net Profit',
      render: (value: number) => {
        const color = getProfitColor(value);
        return (
          <div className={cn(
            'flex items-center space-x-1',
            color === 'profit' && 'text-profit',
            color === 'loss' && 'text-loss'
          )}>
            {value >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span className="font-mono">{formatUsd(value)}</span>
          </div>
        );
      },
    },
    {
      key: 'confidence',
      title: 'Confidence',
      render: (value: number) => (
        <span className="font-mono">{formatPercent(value)}</span>
      ),
    },
    {
      key: 'source',
      title: 'Source',
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
      ),
    },
    {
      key: 'timestamp',
      title: 'Time',
      render: (value: number) => (
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(value)}
        </span>
      ),
    },
  ];

  const signalColumns = [
    {
      key: 'id',
      title: 'Signal ID',
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'shouldExecute',
      title: 'Execute',
      render: (value: boolean) => (
        <StatusBadge status={value ? 'healthy' : 'pending'}>
          {value ? 'Yes' : 'No'}
        </StatusBadge>
      ),
    },
    {
      key: 'evaluationSummary.net_usd_est',
      title: 'Est. Profit',
      render: (value: number) => {
        if (!value) return '—';
        const color = getProfitColor(value);
        return (
          <span className={cn(
            'font-mono',
            color === 'profit' && 'text-profit',
            color === 'loss' && 'text-loss'
          )}>
            {formatUsd(value)}
          </span>
        );
      },
    },
    {
      key: 'evaluationSummary.p_success',
      title: 'Success Rate',
      render: (value: number) => (
        <span className="font-mono">{formatPercent(value)}</span>
      ),
    },
    {
      key: 'timestamp',
      title: 'Time',
      render: (value: number) => (
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(value)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-muted-foreground">Monitor opportunities and signals</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <StatusBadge status={isWsConnected ? 'healthy' : 'degraded'}>
            {isWsConnected ? 'Realtime WS' : 'HTTP Polling'}
          </StatusBadge>
          <Badge variant="outline">
            Live opps: {live?.opportunities?.length ?? 0}
          </Badge>
          <Badge variant="outline">
            Last update: {live?.lastUpdated ? formatTimeAgo(new Date(live.lastUpdated).getTime()) : '—'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="signals">
            Active Signals ({signals.length})
          </TabsTrigger>
          <TabsTrigger value="evaluation">
            Evaluation
          </TabsTrigger>
          <TabsTrigger value="strategies">
            Strategies
          </TabsTrigger>
          <TabsTrigger value="backtests">
            Backtests
          </TabsTrigger>
          <TabsTrigger value="sweep">
            Parameter Sweep
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities">
          <DataTable
            data={opportunities}
            columns={opportunityColumns}
            onRowClick={setSelectedOpportunity}
            isLoading={opportunitiesLoading}
            rowKey={(o) => (o as ArbitrageOpportunity).id ?? `${(o as ArbitrageOpportunity).type}:${(o as ArbitrageOpportunity).path}:${(o as ArbitrageOpportunity).timestamp}`}
          />
        </TabsContent>

        <TabsContent value="signals">
          <DataTable
            data={signals}
            columns={signalColumns}
            onRowClick={setSelectedSignal}
            isLoading={signalsLoading}
            rowKey={(s) => (s as Signal).id}
          />
        </TabsContent>

        <TabsContent value="evaluation">
          <EvaluationForm />
        </TabsContent>

        <TabsContent value="strategies">
          <StrategyRegistry />
        </TabsContent>

        <TabsContent value="backtests">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading backtest visualization…</div>}>
            <BacktestVisualization />
          </Suspense>
        </TabsContent>

        <TabsContent value="sweep">
          <ParameterSweep />
        </TabsContent>
      </Tabs>

      {/* Opportunity Detail Drawer */}
      <Drawer open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <DrawerContent>
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>Opportunity Details</DrawerTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJson(!showJson)}
              >
                {showJson ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                {showJson ? 'View Details' : 'View JSON'}
              </Button>
            </div>
          </DrawerHeader>
          <div className="p-6">
            {selectedOpportunity && (
              <>
                {showJson ? (
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                    {JSON.stringify(selectedOpportunity, null, 2)}
                  </pre>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-2">Basic Info</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="outline">{selectedOpportunity.type}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Source:</span>
                          <span>{selectedOpportunity.source}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Path:</span>
                          <span className="font-mono text-xs">{selectedOpportunity.path}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="font-semibold mb-2">Profitability</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Profit:</span>
                          <span className={cn(
                            'font-mono',
                            getProfitColor(selectedOpportunity.netProfitUsd) === 'profit' && 'text-profit',
                            getProfitColor(selectedOpportunity.netProfitUsd) === 'loss' && 'text-loss'
                          )}>
                            {formatUsd(selectedOpportunity.netProfitUsd)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated Profit:</span>
                          <span className="font-mono">
                            {formatUsd(selectedOpportunity.estimatedProfitUsd)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className="font-mono">
                            {formatPercent(selectedOpportunity.confidence)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Signal Detail Drawer */}
      <Drawer open={!!selectedSignal} onOpenChange={() => setSelectedSignal(null)}>
        <DrawerContent>
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>Signal Details</DrawerTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
              {showJson ? 'View Details' : 'View JSON'}
            </Button>
          </DrawerHeader>
          <div className="p-6">
            {selectedSignal && (
              <>
                {showJson ? (
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                    {JSON.stringify(selectedSignal, null, 2)}
                  </pre>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-2">Signal Info</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono">{selectedSignal.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="outline">{selectedSignal.type}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Should Execute:</span>
                          <StatusBadge status={selectedSignal.shouldExecute ? 'healthy' : 'pending'}>
                            {selectedSignal.shouldExecute ? 'Yes' : 'No'}
                          </StatusBadge>
                        </div>
                      </div>
                    </Card>

                    {selectedSignal.evaluationSummary && (
                      <Card className="p-4">
                        <h3 className="font-semibold mb-2">Evaluation</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Est. Profit:</span>
                            <span className="font-mono">
                              {formatUsd(selectedSignal.evaluationSummary.net_usd_est)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">EV/sec:</span>
                            <span className="font-mono">
                              {formatUsd(selectedSignal.evaluationSummary.ev_per_sec)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Success Rate:</span>
                            <span className="font-mono">
                              {formatPercent(selectedSignal.evaluationSummary.p_success)}
                            </span>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
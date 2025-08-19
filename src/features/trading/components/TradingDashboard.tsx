import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrading, useOpenTrades, useClosedTrades, useTradeHistory } from '../useTrading';
import { Bot, Clock, DollarSign, Percent, BarChart, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const StatusCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  variant?: 'default' | 'positive' | 'negative';
  isLoading?: boolean;
}> = ({ title, value, icon, description, variant = 'default', isLoading = false }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      default:
        return 'text-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getVariantClass()}`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const TradeHistoryTable: React.FC<{ trades: any[] }> = ({ trades }) => {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No trades found
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pair
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Side
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                P&L
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {format(new Date(trade.timestamp), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {trade.pair}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                  trade.side === 'buy' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {trade.side.toUpperCase()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  ${trade.price.toFixed(4)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {trade.amount.toFixed(4)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                  (trade.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {trade.pnl !== undefined ? `$${trade.pnl.toFixed(2)}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TradingDashboard: React.FC = () => {
  const { status, startTrading, stopTrading, isLoading, error } = useTrading();
  const { openTrades, closeTrade } = useOpenTrades();
  const { closedTrades } = useClosedTrades(10);
  const { totalPnl, avgPnl, winningTrades, losingTrades } = useTradeHistory();
  
  const handleStartTrading = () => {
    // In a real app, you'd select a strategy from a dropdown
    startTrading('arbitrage-v1');
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>Error loading trading data: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Trading Dashboard</h2>
        <div className="flex space-x-2">
          {status?.isRunning ? (
            <Button variant="destructive" onClick={stopTrading} disabled={isLoading}>
              Stop Trading
            </Button>
          ) : (
            <Button onClick={handleStartTrading} disabled={isLoading}>
              Start Trading
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Balance"
          value={`$${status?.assets?.USD?.toFixed(2) || '0.00'}`}
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatusCard
          title="P&L (24h)"
          value={`${status?.pnlPercentage ? status.pnlPercentage.toFixed(2) : '0.00'}%`}
          icon={<Percent className="h-4 w-4" />}
          variant={status?.pnlPercentage !== undefined ? (status.pnlPercentage >= 0 ? 'positive' : 'negative') : 'default'}
          isLoading={isLoading}
        />
        <StatusCard
          title="Open Trades"
          value={openTrades.length}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatusCard
          title="Win Rate"
          value={`${winningTrades + losingTrades > 0 ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(1) : '0.0'}%`}
          icon={<BarChart className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open">Open Trades</TabsTrigger>
          <TabsTrigger value="closed">Trade History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-4">Open Positions</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <TradeHistoryTable trades={openTrades} />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-4">Trade History</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <TradeHistoryTable trades={closedTrades} />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${
                      totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      ${totalPnl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average P&L per Trade</p>
                    <p className={`text-xl font-semibold ${
                      avgPnl >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      ${avgPnl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win/Loss Ratio</p>
                    <p className="text-lg font-semibold">
                      {winningTrades}W / {losingTrades}L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Strategy Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>Performance charts coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingDashboard;

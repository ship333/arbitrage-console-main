import { Skeleton } from '@/components/ui/skeleton';
import { useLiveFeed } from '@/ui/hooks/useLiveFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function LiveFeedTab() {
  const { data, isLoading, isWsConnected } = useLiveFeed();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Market Data Feed</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isWsConnected ? 'Live' : 'Polling'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(data?.lastUpdated || 0).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard 
          title="Latency (p50/p95/p99)" 
          value={data?.latency ? 
            `${data.latency.p50}ms / ${data.latency.p95}ms / ${data.latency.p99}ms` : 
            'N/A'
          }
        />
        <MetricCard 
          title="Active Pairs" 
          value={data?.spreads ? Object.keys(data.spreads).length.toString() : '0'}
        />
        <MetricCard 
          title="Total Liquidity" 
          value={data?.liquidity ? 
            `$${Object.values(data.liquidity).reduce((a, b) => a + b, 0).toLocaleString()}` : 
            '$0'
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arbitrage Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.opportunities?.length ? (
            <div className="space-y-2">
              {data.opportunities.map((opp) => (
                <div key={`${opp.pair}-${opp.venue}`} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div className="font-medium">{opp.pair}</div>
                  <div className="space-x-2">
                    <Badge variant="outline">{opp.venue}</Badge>
                    <span className="font-mono">{opp.edgeBps.toFixed(2)} bps</span>
                    <span className="text-muted-foreground">Size: ${opp.size.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active opportunities
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

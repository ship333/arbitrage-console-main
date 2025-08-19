import { useStrategies } from '@/ui/hooks/useStrategies';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function StrategiesTab() {
  const { data: strategies, isLoading, error } = useStrategies();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Failed to load strategies: {error.message}
      </div>
    );
  }

  const venues = ['HL Orderbook', 'HyperSwap', 'Hybra', 'PRJX'] as const;

  return (
    <div className="space-y-6">
      {strategies?.map((strategy) => (
        <div key={strategy.pair} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{strategy.pair}</h3>
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-sm text-muted-foreground">24h PnL: </span>
                <span className={strategy.pnl24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {strategy.pnl24h.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Sharpe: </span>
                <span>{strategy.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue</TableHead>
                <TableHead className="text-right">Edge (bps)</TableHead>
                <TableHead className="text-right">EV</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Fill Prob</TableHead>
                <TableHead className="text-right">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((venue) => {
                const venueData = strategy.venues.find(v => v.name === venue) || {
                  edgeBps: 0,
                  expectedValue: 0,
                  size: 0,
                  fillProbability: 0,
                  lastSeen: 'Never'
                };
                
                return (
                  <TableRow key={`${strategy.pair}-${venue}`}>
                    <TableCell className="font-medium">{venue}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={venueData.edgeBps > 0 ? 'default' : 'outline'}>
                        {venueData.edgeBps.toFixed(2)} bps
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${venueData.expectedValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${venueData.size.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(venueData.fillProbability * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {venueData.lastSeen}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

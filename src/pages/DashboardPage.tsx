import { BotControlPanel } from '@/components/BotControlPanel';
import { useLiveFeed } from '@/ui/hooks/useLiveFeed';
import { useStrategies } from '@/ui/hooks/useStrategies';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';
import { WSStatusBadge } from '@/components/WSStatusBadge';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  isPositive?: boolean;
}

const StatCard = ({ title, value, description, isPositive }: StatCardProps) => (
  <div className="p-4 bg-card rounded-lg border shadow-sm">
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <p className={`text-2xl font-bold ${isPositive !== undefined ? (isPositive ? 'text-green-500' : 'text-red-500') : ''}`}>
      {value}
    </p>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const DashboardPage = () => {
  const { data: liveData } = useLiveFeed();
  const { data: strategies } = useStrategies();

  // Calculate aggregate metrics
  const totalPnl = strategies?.reduce((sum, s) => sum + (s.pnl24h || 0), 0) || 0;
  const totalTrades = strategies?.reduce((sum, s) => {
    // Count venues with recent activity as a proxy for trades
    const venues = s.venues ?? [];
    const activeVenues = venues.filter(v => v.edgeBps > 0).length;
    return sum + activeVenues;
  }, 0) || 0;
  
  // Consider a strategy active if any of its venues have an edge
  const activeBots = strategies?.filter(s => 
    (s.venues ?? []).some(v => v.edgeBps > 0)
  ).length || 0;
  
  const totalLiquidity = liveData?.liquidity ? 
    Object.values(liveData.liquidity).reduce((sum, val) => sum + val, 0) : 0;

  // Safely compute recent opportunities (avoid calling .map on undefined)
  const recentOps = (liveData?.opportunities ?? []).slice(0, 3);

  return (
    <>
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Bot className="h-4 w-4" />
          <span>Live Mode</span>
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="24h P&L" 
          value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}%`}
          description="Across all strategies"
          isPositive={totalPnl >= 0}
        />
        <StatCard 
          title="24h Trades" 
          value={totalTrades.toString()}
          description="Active opportunities"
        />
        <StatCard 
          title="Active Bots" 
          value={`${activeBots}/${strategies?.length || 0}`}
          description="Strategies running"
        />
        <StatCard 
          title="Liquidity" 
          value={`$${(totalLiquidity / 1e6).toFixed(1)}M`}
          description="Total tracked"
        />
      </div>
      
      {/* Main Control Panel */}
      <div className="rounded-lg border bg-card">
        <BotControlPanel />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentOps.length > 0 ? (
              recentOps.map((opp, i) => (
                <div key={`${opp.pair}-${opp.venue}-${i}`} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div>
                    <p className="font-medium">{opp.pair}</p>
                    <p className="text-sm text-muted-foreground">{opp.venue}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{opp.edgeBps.toFixed(2)} bps</p>
                    <p className="text-sm text-muted-foreground">${opp.size.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">No recent activity</div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <h3 className="text-lg font-medium mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Data Feed</span>
              <div className="flex items-center">
                <span className={`h-2 w-2 rounded-full ${liveData ? 'bg-green-500' : 'bg-yellow-500'} mr-2`}></span>
                <span>{liveData ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Update</span>
              <span>{liveData?.lastUpdated ? new Date(liveData.lastUpdated).toLocaleTimeString() : '--:--:--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active Strategies</span>
              <span>{activeBots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <WSStatusBadge />
    </>
  );
};

export default DashboardPage;

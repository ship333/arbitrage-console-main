import { Activity, DollarSign, TrendingUp, Clock, BarChart2 } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { MainLayout } from '../components/MainLayout';

export function Dashboard() {
  // Mock data - in a real app, this would come from your API
  const metrics = [
    { title: 'Total PnL', value: '$12,450.20', change: 12.5, icon: <DollarSign className="h-4 w-4" /> },
    { title: 'Daily PnL', value: '$1,243.50', change: 8.2, icon: <TrendingUp className="h-4 w-4" /> },
    { title: 'Win Rate', value: '78.5%', change: 5.3, icon: <Activity className="h-4 w-4" /> },
    { title: 'Avg Trade Duration', value: '2.4m', change: -2.1, icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your arbitrage bot's performance and metrics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
            />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="lovable-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">PnL History</h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span>7 days</span>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <BarChart2 className="h-12 w-12 opacity-20" />
              <span className="ml-2">Chart will be rendered here</span>
            </div>
          </div>
          
          <div className="lovable-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Trades</h3>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium">ETH/USDC</p>
                    <p className="text-sm text-muted-foreground">2 min ago</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-500">+$124.50</p>
                    <p className="text-sm text-muted-foreground">0.05 ETH</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

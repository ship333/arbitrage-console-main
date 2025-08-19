import { Play, Pause, Gauge, Zap, Clock } from 'lucide-react';
import { MainLayout } from '../components/MainLayout';

export function PaperTrading() {
  const isRunning = true; // This would come from your state management
  const botSpeed = 1; // This would come from your state management

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Paper Trading</h2>
          <p className="text-muted-foreground">
            Test your strategies with simulated trading
          </p>
        </div>

        <div className="grid gap-6">
          <div className="lovable-card p-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <h3 className="text-lg font-semibold">Bot Controls</h3>
                <p className="text-sm text-muted-foreground">
                  {isRunning ? 'Bot is currently running' : 'Bot is currently stopped'}
                </p>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  {isRunning ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Bot
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Bot
                    </>
                  )}
                </button>
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                  <Zap className="mr-2 h-4 w-4" />
                  Emergency Stop
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border/40">
              <h4 className="text-sm font-medium mb-4">Simulation Speed</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={botSpeed}
                      className="w-full h-2 bg-primary/20 rounded-full appearance-none cursor-pointer"
                    />
                    <div 
                      className="absolute top-0 left-0 h-2 bg-primary rounded-full"
                      style={{ width: `${(botSpeed / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-10 text-center">{botSpeed}x</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Adjust the simulation speed to test different market conditions
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="lovable-card p-6">
              <h3 className="text-lg font-semibold mb-4">Trading Pairs</h3>
              <div className="space-y-3">
                {['BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'ARB/USDC'].map((pair) => (
                  <label key={pair} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-primary text-primary focus:ring-primary" />
                    <span className="text-sm font-medium">{pair}</span>
                  </label>
                ))}
              </div>
              <button className="mt-4 text-sm text-primary hover:underline">
                + Add Custom Pair
              </button>
            </div>

            <div className="lovable-card p-6">
              <h3 className="text-lg font-semibold mb-4">Trading Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                  <span className="font-medium">124</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="font-medium text-green-500">78.5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Profit</span>
                  <span className="font-medium">$124.30</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total PnL</span>
                  <span className="font-medium text-green-500">+$12,450.20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import { Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { MainLayout } from '../components/MainLayout';

export function Calibration() {
  // Mock data - in a real app, this would come from your API
  const calibrationData = [
    {
      pair: 'BTC/USDC',
      k: 0.0015,
      alpha: 1.2,
      lastUpdated: '2 minutes ago',
      confidence: 0.95,
    },
    {
      pair: 'ETH/USDC',
      k: 0.0021,
      alpha: 1.15,
      lastUpdated: '5 minutes ago',
      confidence: 0.92,
    },
    {
      pair: 'SOL/USDC',
      k: 0.0032,
      alpha: 1.3,
      lastUpdated: '8 minutes ago',
      confidence: 0.89,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Calibration</h2>
              <p className="text-muted-foreground">
                Adjust and monitor calibration parameters for your trading pairs
              </p>
            </div>
            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalibrate All
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="lovable-card p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Settings className="h-5 w-5 mr-2 text-primary" />
                Slippage Parameters
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Adjust the k and α parameters that control the slippage model for each trading pair
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Pair</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">k (Slippage Coef)</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">α (Curve Shape)</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Confidence</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Last Updated</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {calibrationData.map((item) => (
                    <tr key={item.pair} className="hover:bg-muted/50">
                      <td className="py-4 px-4 font-medium">{item.pair}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center justify-end">
                          <input
                            type="number"
                            step="0.0001"
                            value={item.k}
                            className="w-24 text-right bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center justify-end">
                          <input
                            type="number"
                            step="0.01"
                            value={item.alpha}
                            className="w-24 text-right bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-1"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center justify-end">
                          <div className="relative w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full ${
                                item.confidence > 0.9 ? 'bg-green-500' : 
                                item.confidence > 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${item.confidence * 100}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs font-medium">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                        {item.lastUpdated}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button className="text-primary hover:text-primary/80">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lovable-card p-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Calibration Tips</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  • Higher <code className="bg-muted px-1 rounded">k</code> values increase slippage tolerance
                  <br />
                  • <code className="bg-muted px-1 rounded">α</code> controls the curvature of the price impact function
                  <br />
                  • Recalibrate after significant market movements or strategy changes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import { useState } from 'react';
import { useEvaluateBatch } from '@/lib/queries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Zap, Play, Square } from 'lucide-react';
import { SweepParameter, SweepResult } from '@/lib/types';
import { formatUsd, formatPercent } from '@/lib/formatters';

export function ParameterSweep() {
  const [parameters, setParameters] = useState<SweepParameter[]>([
    { name: 'edge_bps', min: 5, max: 50, step: 5 },
    { name: 'notional_usd', min: 1000, max: 50000, step: 5000 }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SweepResult[]>([]);
  const [sweepConfig, setSweepConfig] = useState({
    pair: 'ETH/USDC',
    baseGasUsd: 15,
    baseFlashFeeBps: 5,
    baseSlippageBps: 3
  });

  const evaluateBatch = useEvaluateBatch();
  const { toast } = useToast();

  const updateParameter = (index: number, field: keyof SweepParameter, value: number) => {
    setParameters(prev => prev.map((param, i) => 
      i === index ? { ...param, [field]: value } : param
    ));
  };

  const addParameter = () => {
    setParameters(prev => [...prev, { name: 'gas_usd', min: 5, max: 50, step: 5 }]);
  };

  const removeParameter = (index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  };

  const generateParameterCombinations = () => {
    const combinations: Record<string, number>[] = [];
    
    const generate = (paramIndex: number, current: Record<string, number>) => {
      if (paramIndex >= parameters.length) {
        combinations.push({ ...current });
        return;
      }
      
      const param = parameters[paramIndex];
      for (let value = param.min; value <= param.max; value += param.step) {
        generate(paramIndex + 1, { ...current, [param.name]: value });
      }
    };
    
    generate(0, {});
    return combinations;
  };

  const runSweep = async () => {
    const combinations = generateParameterCombinations();
    
    if (combinations.length > 100) {
      toast({
        title: "Too many combinations",
        description: `This would generate ${combinations.length} evaluations. Please reduce the parameter ranges.`,
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setResults([]);
    setProgress(0);

    try {
      const batchSize = 10;
      const newResults: SweepResult[] = [];

      for (let i = 0; i < combinations.length; i += batchSize) {
        const batch = combinations.slice(i, i + batchSize);
        
        const evalRequest = {
          items: batch.map(combo => ({
            pair: sweepConfig.pair,
            edge_bps: combo.edge_bps || 25,
            notional_usd: combo.notional_usd || 10000,
            gas_usd: combo.gas_usd || sweepConfig.baseGasUsd,
            flash_fee_bps: combo.flash_fee_bps || sweepConfig.baseFlashFeeBps,
            slip_bps: combo.slip_bps || sweepConfig.baseSlippageBps
          })),
          defaults: {
            BASE_FILL_PROB: 0.8,
            FILL_THETA: 2.0,
            SLIP_ALPHA: 1.5,
            SLIP_K: 0.1,
            RISK_AVERSION_LAMBDA: 0.1
          }
        };

        const response = await evaluateBatch.mutateAsync(evalRequest);
        
        response.items.forEach((item, index) => {
          newResults.push({
            parameters: batch[index],
            ...item
          });
        });

        setProgress(Math.round(((i + batch.length) / combinations.length) * 100));
        setResults([...newResults]);
      }

      toast({
        title: "Parameter sweep complete",
        description: `Evaluated ${combinations.length} parameter combinations`,
      });
    } catch (error) {
      toast({
        title: "Sweep failed",
        description: "Failed to complete parameter sweep: " + error,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };

  const stopSweep = () => {
    setIsRunning(false);
    setProgress(0);
  };

  // Find best results
  const bestByProfit = results.reduce((best, current) => 
    current.net_usd_est > (best?.net_usd_est || -Infinity) ? current : best, null as SweepResult | null);
  
  const bestBySuccess = results.reduce((best, current) => 
    current.p_success > (best?.p_success || -Infinity) ? current : best, null as SweepResult | null);

  const bestByEvPerSec = results.reduce((best, current) => 
    current.ev_per_sec > (best?.ev_per_sec || -Infinity) ? current : best, null as SweepResult | null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Parameter Sweep</h3>
          <p className="text-sm text-muted-foreground">
            Test parameter sensitivity using the evaluation API
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Synthetic Analysis Only
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration */}
        <Card className="p-6">
          <h4 className="font-medium mb-4">Sweep Configuration</h4>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pair">Trading Pair</Label>
                <Input
                  id="pair"
                  value={sweepConfig.pair}
                  onChange={(e) => setSweepConfig(prev => ({ ...prev, pair: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseGas">Base Gas ($)</Label>
                <Input
                  id="baseGas"
                  type="number"
                  value={sweepConfig.baseGasUsd}
                  onChange={(e) => setSweepConfig(prev => ({ ...prev, baseGasUsd: Number(e.target.value) }))}
                />
              </div>
            </div>

            <h5 className="font-medium">Parameter Ranges</h5>
            
            {parameters.map((param, index) => (
              <div key={`${param.name}-${index}`} className="p-3 border rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{param.name}</Label>
                  {parameters.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParameter(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Min</Label>
                    <Input
                      type="number"
                      value={param.min}
                      onChange={(e) => updateParameter(index, 'min', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max</Label>
                    <Input
                      type="number"
                      value={param.max}
                      onChange={(e) => updateParameter(index, 'max', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Step</Label>
                    <Input
                      type="number"
                      value={param.step}
                      onChange={(e) => updateParameter(index, 'step', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addParameter} className="w-full">
              Add Parameter
            </Button>

            <div className="pt-4">
              {isRunning ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Running sweep...</span>
                    <Button variant="outline" size="sm" onClick={stopSweep}>
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </div>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">{progress}% complete</p>
                </div>
              ) : (
                <Button onClick={runSweep} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Run Parameter Sweep
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="h-5 w-5" />
            <h4 className="font-medium">Sweep Results</h4>
            {results.length > 0 && (
              <Badge variant="secondary">{results.length} evaluations</Badge>
            )}
          </div>

          {results.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Run a parameter sweep to see results</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Best Results */}
              {bestByProfit && (
                <div className="space-y-3">
                  <h5 className="font-medium">Top Performers</h5>
                  
                  <div className="space-y-2">
                    <div className="p-3 bg-profit/10 rounded-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Best Profit</span>
                        <Badge variant="outline" className="text-profit">
                          {formatUsd(bestByProfit.net_usd_est)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Object.entries(bestByProfit.parameters).map(([key, value]) => 
                          `${key}: ${value}`
                        ).join(', ')}
                      </div>
                    </div>

                    {bestBySuccess && (
                      <div className="p-3 bg-primary/10 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Best Success Rate</span>
                          <Badge variant="outline">
                            {formatPercent(bestBySuccess.p_success)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(bestBySuccess.parameters).map(([key, value]) => 
                            `${key}: ${value}`
                          ).join(', ')}
                        </div>
                      </div>
                    )}

                    {bestByEvPerSec && (
                      <div className="p-3 bg-secondary/50 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Best EV/sec</span>
                          <Badge variant="outline">
                            {formatUsd(bestByEvPerSec.ev_per_sec)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(bestByEvPerSec.parameters).map(([key, value]) => 
                            `${key}: ${value}`
                          ).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="space-y-2">
                <h5 className="font-medium">All Results</h5>
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-1">
                    {results
                      .sort((a, b) => b.net_usd_est - a.net_usd_est)
                      .slice(0, 20)
                      .map((result, index) => (
                        <div
                          key={`${Object.entries(result.parameters).map(([k, v]) => `${k}:${v}`).join('|')}-${index}`}
                          className="flex justify-between items-center p-2 text-sm border-b"
                        >
                          <div className="text-xs text-muted-foreground font-mono">
                            {Object.entries(result.parameters).map(([key, value]) => 
                              `${key}:${value}`
                            ).join(' ')}
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {formatUsd(result.net_usd_est)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {formatPercent(result.p_success)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useEvaluateBatch } from '@/lib/queries';
import { formatUsd, formatBps, formatPercent } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Calculator, TrendingUp, Zap, DollarSign } from 'lucide-react';
import { EvalFormData } from '@/lib/types';

export function EvaluationForm() {
  const [formData, setFormData] = useState<EvalFormData>({
    pair: 'ETH/USDC',
    edgeBps: 25,
    notional: 10000,
    flashFeeBps: 5,
    gasUsd: 15,
    slippageBps: 3
  });

  const evaluateBatch = useEvaluateBatch();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const evalRequest = {
        items: [{
          pair: formData.pair,
          edge_bps: formData.edgeBps,
          notional_usd: formData.notional,
          flash_fee_bps: formData.flashFeeBps,
          gas_usd: formData.gasUsd,
          slip_bps: formData.slippageBps
        }],
        defaults: {
          BASE_FILL_PROB: 0.8,
          FILL_THETA: 2.0,
          SLIP_ALPHA: 1.5,
          SLIP_K: 0.1,
          RISK_AVERSION_LAMBDA: 0.1
        }
      };

      await evaluateBatch.mutateAsync(evalRequest);
      
      toast({
        title: "Evaluation complete",
        description: "Strategy parameters evaluated successfully",
      });
    } catch (error) {
      toast({
        title: "Evaluation failed",
        description: "Failed to evaluate parameters: " + error,
        variant: "destructive",
      });
    }
  };

  const updateField = <K extends keyof EvalFormData>(
    field: K,
    value: EvalFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const result = evaluateBatch.data?.items?.[0];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Quick Evaluation</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pair">Trading Pair</Label>
              <Input
                id="pair"
                value={formData.pair}
                onChange={(e) => updateField('pair', e.target.value)}
                placeholder="ETH/USDC"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edgeBps">Edge (bps)</Label>
              <Input
                id="edgeBps"
                type="number"
                value={formData.edgeBps}
                onChange={(e) => updateField('edgeBps', Number(e.target.value))}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notional">Notional ($)</Label>
              <Input
                id="notional"
                type="number"
                value={formData.notional}
                onChange={(e) => updateField('notional', Number(e.target.value))}
                min="0"
                step="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="flashFeeBps">Flash Fee (bps)</Label>
              <Input
                id="flashFeeBps"
                type="number"
                value={formData.flashFeeBps}
                onChange={(e) => updateField('flashFeeBps', Number(e.target.value))}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gasUsd">Gas Cost ($)</Label>
              <Input
                id="gasUsd"
                type="number"
                value={formData.gasUsd}
                onChange={(e) => updateField('gasUsd', Number(e.target.value))}
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slippageBps">Slippage (bps)</Label>
              <Input
                id="slippageBps"
                type="number"
                value={formData.slippageBps}
                onChange={(e) => updateField('slippageBps', Number(e.target.value))}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={evaluateBatch.isPending}
          >
            {evaluateBatch.isPending ? 'Evaluating...' : 'Evaluate Strategy'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Evaluation Results</h3>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-profit" />
                  <span className="text-sm font-medium">Net Profit</span>
                </div>
                <div className="text-xl font-bold text-profit">
                  {formatUsd(result.net_usd_est)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">EV/sec</span>
                </div>
                <div className="text-xl font-bold">
                  {formatUsd(result.ev_per_sec)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Probability:</span>
                <Badge variant="outline">{formatPercent(result.p_success)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Optimal Size:</span>
                <span className="font-mono">{formatUsd(result.size_opt_usd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Slippage:</span>
                <span className="font-mono">{formatBps(result.slip_bps_eff)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Breakeven:</span>
                <span className="font-mono">{formatBps(result.breakeven_bps)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Execution Time:</span>
                <span className="font-mono">{result.seconds.toFixed(1)}s</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Cost Breakdown</h4>
              <div className="grid gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas:</span>
                  <span>{formatUsd(result.gas_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flash Loan:</span>
                  <span>{formatUsd(result.flash_cost_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executor Fee:</span>
                  <span>{formatUsd(result.executor_fee_usd)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Submit evaluation to see results</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
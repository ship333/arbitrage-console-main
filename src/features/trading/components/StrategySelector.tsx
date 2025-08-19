import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { getAllStrategies, Strategy } from '@/features/strategies';

interface StrategySelectorProps {
  onStrategySelect: (strategyId: string, params: Record<string, any>) => void;
  activeStrategy?: string;
  isLoading?: boolean;
}

const StrategySelector: React.FC<StrategySelectorProps> = ({
  onStrategySelect,
  activeStrategy,
  isLoading = false,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});
  const strategies = getAllStrategies();

  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    // Initialize default parameters
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      const defaults: Record<string, any> = {};
      Object.entries(strategy.parameters).forEach(([key, param]) => {
        defaults[key] = param.default;
      });
      setStrategyParams(defaults);
    }
  };

  const handleParamChange = (paramName: string, value: any) => {
    setStrategyParams(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStrategy) {
      onStrategySelect(selectedStrategy, strategyParams);
    }
  };

  const renderParameterInput = (paramName: string, paramConfig: any) => {
    switch (paramConfig.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={paramName} className="text-sm">
                {paramConfig.label}
              </Label>
              <span className="text-xs text-muted-foreground">
                {strategyParams[paramName] ?? paramConfig.default} {paramConfig.unit || ''}
              </span>
            </div>
            <div className="flex gap-2">
              <Slider
                id={paramName}
                min={paramConfig.min}
                max={paramConfig.max}
                step={paramConfig.step || 1}
                value={[strategyParams[paramName] ?? paramConfig.default]}
                onValueChange={([value]) => handleParamChange(paramName, value)}
                className="flex-1"
              />
            </div>
            {paramConfig.description && (
              <p className="text-xs text-muted-foreground">{paramConfig.description}</p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={paramName} className="text-sm">
              {paramConfig.label}
            </Label>
            <Select
              value={strategyParams[paramName] ?? paramConfig.default}
              onValueChange={(value) => handleParamChange(paramName, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${paramConfig.label}`} />
              </SelectTrigger>
              <SelectContent>
                {paramConfig.options.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paramConfig.description && (
              <p className="text-xs text-muted-foreground">{paramConfig.description}</p>
            )}
          </div>
        );
      
      case 'boolean':
        return (
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor={paramName} className="text-sm">
                {paramConfig.label}
              </Label>
              {paramConfig.description && (
                <p className="text-xs text-muted-foreground">{paramConfig.description}</p>
              )}
            </div>
            <Switch
              id={paramName}
              checked={strategyParams[paramName] ?? paramConfig.default}
              onCheckedChange={(checked) => handleParamChange(paramName, checked)}
            />
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={paramName} className="text-sm">
              {paramConfig.label}
            </Label>
            <Input
              id={paramName}
              type={paramConfig.type || 'text'}
              value={strategyParams[paramName] ?? paramConfig.default ?? ''}
              onChange={(e) => handleParamChange(paramName, e.target.value)}
              placeholder={paramConfig.placeholder}
            />
            {paramConfig.description && (
              <p className="text-xs text-muted-foreground">{paramConfig.description}</p>
            )}
          </div>
        );
    }
  };

  const selectedStrategyData = strategies.find(s => s.id === selectedStrategy);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Select Trading Strategy</CardTitle>
        <CardDescription>
          Choose and configure a trading strategy to start automated trading.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue={strategies[0]?.id} 
          className="w-full"
          onValueChange={handleStrategySelect}
        >
          <TabsList className="grid w-full grid-cols-2">
            {strategies.map((strategy) => (
              <TabsTrigger 
                key={strategy.id} 
                value={strategy.id}
                disabled={isLoading}
              >
                {strategy.name}
                {activeStrategy === strategy.id && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {strategies.map((strategy) => (
              <TabsContent key={strategy.id} value={strategy.id} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{strategy.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {strategy.description}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Parameters</h4>
                  <div className="space-y-4">
                    {Object.entries(strategy.parameters).map(([paramName, paramConfig]) => (
                      <div key={paramName} className="space-y-3 p-4 border rounded-md">
                        {renderParameterInput(paramName, paramConfig)}
                      </div>
                    ))}
                  </div>
                </div>
                
                {strategy.id === 'arbitrage-v1' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Arbitrage Info</AlertTitle>
                    <AlertDescription>
                      This strategy requires access to multiple DEXs with sufficient liquidity. 
                      Ensure you have enough funds to cover gas fees for rapid trades.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading || activeStrategy === strategy.id}
                  >
                    {isLoading ? 'Activating...' : 'Activate Strategy'}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StrategySelector;

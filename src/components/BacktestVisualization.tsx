import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Upload, Download, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { BacktestRow, BacktestSummary } from '@/lib/types';
import { parseBacktestCsv, parseBacktestJson, groupByStrategy, generateSampleBacktest } from '@/lib/parsers';
import { formatUsd, formatPercent } from '@/lib/formatters';

export function BacktestVisualization() {
  const [backtestData, setBacktestData] = useState<BacktestRow[]>([]);
  const [summaries, setSummaries] = useState<BacktestSummary[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const processBacktestData = useCallback((data: BacktestRow[]) => {
    setBacktestData(data);
    const strategyData = groupByStrategy(data);
    setSummaries(strategyData);
    setSelectedStrategies(strategyData.map(s => s.strategy));
    
    toast({
      title: "Backtest data loaded",
      description: `Processed ${data.length} trades across ${strategyData.length} strategies`,
    });
  }, [toast]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      let data: BacktestRow[];
      
      if (file.name.endsWith('.csv')) {
        data = await parseBacktestCsv(file);
      } else if (file.name.endsWith('.json')) {
        data = await parseBacktestJson(file);
      } else {
        throw new Error('Unsupported file format. Please upload CSV or JSON files.');
      }

      processBacktestData(data);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: String(error),
        variant: "destructive",
      });
    }
  }, [processBacktestData, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const loadSampleData = () => {
    const sampleData = generateSampleBacktest();
    processBacktestData(sampleData);
  };

  const exportData = () => {
    if (backtestData.length === 0) return;
    
    const csv = [
      'timestamp,strategy,edge_bps,notional,ev_usd,p_success,pnl_usd,drawdown,hit_rate,gas_usd,slippage_bps',
      ...backtestData.map(row => 
        `${new Date(row.timestamp).toISOString()},${row.strategy},${row.edge_bps},${row.notional},${row.ev_usd},${row.p_success},${row.pnl_usd},${row.drawdown},${row.hit_rate},${row.gas_usd || ''},${row.slippage_bps || ''}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const chartData = backtestData
    .filter(row => selectedStrategies.includes(row.strategy))
    .sort((a, b) => a.timestamp - b.timestamp)
    .reduce((acc, row) => {
      const existing = acc.find(item => item.timestamp === row.timestamp);
      if (existing) {
        existing[`${row.strategy}_pnl`] = (existing[`${row.strategy}_pnl`] || 0) + row.pnl_usd;
        existing[`${row.strategy}_cumulative`] = (existing[`${row.strategy}_cumulative`] || 0) + row.pnl_usd;
      } else {
        const newItem: any = {
          timestamp: row.timestamp,
          date: new Date(row.timestamp).toLocaleDateString(),
          [`${row.strategy}_pnl`]: row.pnl_usd,
          [`${row.strategy}_cumulative`]: row.pnl_usd
        };
        acc.push(newItem);
      }
      return acc;
    }, [] as any[]);

  // Calculate cumulative PnL
  selectedStrategies.forEach(strategy => {
    let cumulative = 0;
    chartData.forEach(item => {
      cumulative += item[`${strategy}_pnl`] || 0;
      item[`${strategy}_cumulative`] = cumulative;
    });
  });

  const toggleStrategy = (strategy: string) => {
    setSelectedStrategies(prev => 
      prev.includes(strategy) 
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Backtest Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Import and visualize historical trading performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadSampleData}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Load Sample
          </Button>
          {backtestData.length > 0 && (
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {backtestData.length === 0 ? (
        <Card className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Upload Backtest Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop CSV or JSON files, or click to browse
            </p>
            <div className="space-y-2">
              <Input
                type="file"
                accept=".csv,.json"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="max-w-xs mx-auto"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, JSON (max 10MB)
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Strategy Selection */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Strategy Comparison</h4>
              <Badge variant="outline">
                {selectedStrategies.length} of {summaries.length} strategies
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaries.map(summary => (
                <Button
                  key={summary.strategy}
                  variant={selectedStrategies.includes(summary.strategy) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleStrategy(summary.strategy)}
                  className="h-auto p-2"
                >
                  <div className="text-center">
                    <div className="font-medium">{summary.strategy}</div>
                    <div className="text-xs opacity-75">
                      {formatUsd(summary.totalPnL)}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {summaries
              .filter(s => selectedStrategies.includes(s.strategy))
              .map(summary => (
                <Card key={summary.strategy} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">{summary.strategy}</h4>
                      <Badge variant={summary.totalPnL >= 0 ? "default" : "destructive"}>
                        {summary.totalPnL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total PnL:</span>
                        <span className={summary.totalPnL >= 0 ? 'text-profit' : 'text-loss'}>
                          {formatUsd(summary.totalPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span>{formatPercent(summary.winRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max DD:</span>
                        <span>{formatPercent(summary.maxDrawdown)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trades:</span>
                        <span>{summary.totalTrades}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          {/* Charts */}
          <Tabs defaultValue="pnl" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pnl">Cumulative PnL</TabsTrigger>
              <TabsTrigger value="daily">Daily Returns</TabsTrigger>
              <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
            </TabsList>

            <TabsContent value="pnl">
              <Card className="p-6">
                <h4 className="font-medium mb-4">Cumulative PnL Over Time</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatUsd(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatUsd(value), 'PnL']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    {selectedStrategies.map((strategy, index) => (
                      <Line
                        key={strategy}
                        type="monotone"
                        dataKey={`${strategy}_cumulative`}
                        stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                        strokeWidth={2}
                        name={strategy}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            <TabsContent value="daily">
              <Card className="p-6">
                <h4 className="font-medium mb-4">Daily Returns</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatUsd(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatUsd(value), 'Daily PnL']}
                    />
                    {selectedStrategies.map((strategy, index) => (
                      <Bar
                        key={strategy}
                        dataKey={`${strategy}_pnl`}
                        fill={`hsl(${index * 137.5}, 70%, 50%)`}
                        name={strategy}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            <TabsContent value="drawdown">
              <Card className="p-6">
                <h4 className="font-medium mb-4">Drawdown Analysis</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatPercent(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatPercent(value), 'Drawdown']}
                    />
                    {selectedStrategies.map((strategy, index) => (
                      <Area
                        key={strategy}
                        type="monotone"
                        dataKey={`${strategy}_drawdown`}
                        stackId="1"
                        stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                        fill={`hsl(${index * 137.5}, 70%, 50%)`}
                        fillOpacity={0.3}
                        name={strategy}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
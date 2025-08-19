import { BacktestRow, BacktestSummary } from './types';

export async function parseBacktestCsv(file: File): Promise<BacktestRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const rows: BacktestRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: any = {};
          
          headers.forEach((header, index) => {
            const value = values[index];
            if (header === 'timestamp') {
              row[header] = new Date(value).getTime();
            } else if (header === 'strategy') {
              row[header] = value;
            } else {
              row[header] = parseFloat(value) || 0;
            }
          });
          
          rows.push(row as BacktestRow);
        }
        
        resolve(rows);
      } catch (error) {
        reject(new Error('Failed to parse CSV: ' + error));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function parseBacktestJson(file: File): Promise<BacktestRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Handle different JSON formats
        let rows: BacktestRow[];
        if (Array.isArray(json)) {
          rows = json;
        } else if (json.results && Array.isArray(json.results)) {
          rows = json.results;
        } else if (json.data && Array.isArray(json.data)) {
          rows = json.data;
        } else {
          throw new Error('Unsupported JSON format');
        }
        
        // Validate and normalize data
        const normalizedRows = rows.map(row => ({
          ...row,
          timestamp: typeof row.timestamp === 'string' 
            ? new Date(row.timestamp).getTime() 
            : row.timestamp
        }));
        
        resolve(normalizedRows);
      } catch (error) {
        reject(new Error('Failed to parse JSON: ' + error));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function groupByStrategy(results: BacktestRow[]): BacktestSummary[] {
  const grouped = results.reduce((acc, row) => {
    if (!acc[row.strategy]) {
      acc[row.strategy] = [];
    }
    acc[row.strategy].push(row);
    return acc;
  }, {} as Record<string, BacktestRow[]>);

  return Object.entries(grouped).map(([strategy, rows]) => {
    const totalPnL = rows.reduce((sum, row) => sum + row.pnl_usd, 0);
    const winningTrades = rows.filter(row => row.pnl_usd > 0).length;
    const winRate = winningTrades / rows.length;
    
    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumPnL = 0;
    
    rows.forEach(row => {
      cumPnL += row.pnl_usd;
      if (cumPnL > peak) peak = cumPnL;
      const drawdown = (peak - cumPnL) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    // Calculate volatility and Sharpe ratio
    const avgPnL = totalPnL / rows.length;
    const variance = rows.reduce((sum, row) => 
      sum + Math.pow(row.pnl_usd - avgPnL, 2), 0) / rows.length;
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility > 0 ? avgPnL / volatility : 0;
    
    const timestamps = rows.map(row => row.timestamp).sort((a, b) => a - b);
    
    return {
      strategy,
      totalPnL,
      maxDrawdown,
      winRate,
      sharpeRatio,
      totalTrades: rows.length,
      avgPnL,
      volatility,
      startDate: timestamps[0],
      endDate: timestamps[timestamps.length - 1]
    };
  });
}

export function generateSampleBacktest(): BacktestRow[] {
  const strategies = ['Triangular', 'Cross-Venue', 'Direct'];
  const rows: BacktestRow[] = [];
  
  const startTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
  
  for (let i = 0; i < 1000; i++) {
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const timestamp = startTime + (i * 43200000); // Every 12 hours
    
    const edge_bps = Math.random() * 50 + 5; // 5-55 bps
    const notional = Math.random() * 50000 + 1000; // $1k-$50k
    const p_success = Math.max(0.1, Math.min(0.95, Math.random() * 0.8 + 0.2));
    
    const ev_usd = (edge_bps / 10000) * notional * p_success;
    const actualSuccess = Math.random() < p_success;
    const pnl_usd = actualSuccess ? ev_usd * (0.8 + Math.random() * 0.4) : -Math.random() * 100;
    
    rows.push({
      timestamp,
      strategy,
      edge_bps,
      notional,
      ev_usd,
      p_success,
      pnl_usd,
      drawdown: 0, // Will be calculated in groupByStrategy
      hit_rate: actualSuccess ? 1 : 0,
      gas_usd: Math.random() * 20 + 5,
      slippage_bps: Math.random() * 10 + 1
    });
  }
  
  return rows;
}
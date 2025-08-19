import { v4 as uuidv4 } from 'uuid';
import { Trade, BotStatus } from '@/lib/api';
import { getPoolTokens } from '../strategies/arbitrage';

export interface PaperTrade extends Trade {
  id: string;
  status: 'open' | 'closed' | 'liquidated';
  entryTime: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  pnl?: number;
  pnlPercentage?: number;
  fees: number;
  metadata?: Record<string, any>;
}

export interface PaperTradingState {
  balance: number;
  openTrades: PaperTrade[];
  closedTrades: PaperTrade[];
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  peakBalance: number;
}

const FEE_RATE = 0.003; // 0.3% trading fee
const INITIAL_BALANCE = 10000; // Starting balance in USD

export class PaperTradingService {
  private state: PaperTradingState;
  private status: BotStatus;
  private priceFeed: Record<string, number> = {};

  constructor(initialBalance: number = INITIAL_BALANCE) {
    this.state = this.initializeState(initialBalance);
    this.status = this.initializeStatus();
  }

  private initializeState(initialBalance: number): PaperTradingState {
    return {
      balance: initialBalance,
      openTrades: [],
      closedTrades: [],
      totalPnl: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      maxDrawdown: 0,
      peakBalance: initialBalance,
    };
  }

  private initializeStatus(): BotStatus {
    return {
      isRunning: false,
      currentStrategy: '',
      startTime: new Date().toISOString(),
      pnl: 0,
      pnlPercentage: 0,
      tradesCount: 0,
      winRate: 0,
      assets: {},
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  public updatePrices(prices: Record<string, number>): void {
    this.priceFeed = { ...this.priceFeed, ...prices };
    this.updateOpenTrades();
  }

  public openPosition(
    pair: string,
    side: 'long' | 'short',
    amount: number,
    price?: number
  ): PaperTrade | null {
    const currentPrice = price || this.priceFeed[pair];
    if (!currentPrice) return null;

    const entryPrice = side === 'long' ? currentPrice : currentPrice * 1.001; // Add spread for short
    const tradeAmount = Math.min(amount, this.state.balance / entryPrice);
    const fees = tradeAmount * entryPrice * FEE_RATE;

    if (fees >= this.state.balance) return null;

    const trade: PaperTrade = {
      id: uuidv4(),
      strategy: this.status.currentStrategy,
      pair,
      side: side === 'long' ? 'buy' : 'sell',
      amount: tradeAmount,
      price: entryPrice,
      timestamp: new Date().toISOString(),
      status: 'open',
      entryTime: new Date().toISOString(),
      entryPrice,
      fees,
      metadata: {
        type: 'paper',
        initialBalance: this.state.balance,
      },
    };

    this.state.balance -= fees;
    this.state.openTrades.push(trade);
    this.state.totalTrades++;

    this.updateStatus();
    return trade;
  }

  public closePosition(tradeId: string, price?: number): PaperTrade | null {
    const tradeIndex = this.state.openTrades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return null;

    const trade = this.state.openTrades[tradeIndex];
    const currentPrice = price || this.priceFeed[trade.pair];
    if (!currentPrice) return null;

    const exitPrice = trade.side === 'buy' ? currentPrice : currentPrice * 0.999; // Add spread for short
    const pnl = trade.side === 'buy' 
      ? (exitPrice - trade.entryPrice) * trade.amount
      : (trade.entryPrice - exitPrice) * trade.amount;
    
    const pnlPercentage = (pnl / (trade.entryPrice * trade.amount)) * 100;
    const fees = trade.amount * exitPrice * FEE_RATE;
    
    const closedTrade: PaperTrade = {
      ...trade,
      status: 'closed',
      exitTime: new Date().toISOString(),
      exitPrice,
      pnl,
      pnlPercentage,
      fees: trade.fees + fees,
    };

    // Update balance
    this.state.balance += pnl - fees;
    
    // Update stats
    if (pnl > 0) {
      this.state.winningTrades++;
    } else {
      this.state.losingTrades++;
    }
    
    this.state.totalPnl += pnl;
    this.state.winRate = (this.state.winningTrades / this.state.totalTrades) * 100;
    
    // Update max drawdown
    if (this.state.balance > this.state.peakBalance) {
      this.state.peakBalance = this.state.balance;
    } else {
      const drawdown = ((this.state.peakBalance - this.state.balance) / this.state.peakBalance) * 100;
      this.state.maxDrawdown = Math.max(this.state.maxDrawdown, drawdown);
    }

    // Move trade to closed trades
    this.state.openTrades.splice(tradeIndex, 1);
    this.state.closedTrades.push(closedTrade);

    this.updateStatus();
    return closedTrade;
  }

  private updateOpenTrades(): void {
    this.state.openTrades.forEach(trade => {
      const currentPrice = this.priceFeed[trade.pair];
      if (!currentPrice) return;

      // Check for stop loss / take profit
      const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
      const isProfit = trade.side === 'buy' ? priceChange > 0 : priceChange < 0;
      
      // This is a simplified version - in a real app, you'd check against strategy parameters
      if (Math.abs(priceChange) > 5) { // 5% TP/SL for example
        this.closePosition(trade.id, currentPrice);
      }
    });
  }

  private updateStatus(): void {
    const totalValue = this.calculateTotalValue();
    const pnl = totalValue - INITIAL_BALANCE;
    const pnlPercentage = (pnl / INITIAL_BALANCE) * 100;

    this.status = {
      ...this.status,
      pnl,
      pnlPercentage,
      tradesCount: this.state.totalTrades,
      winRate: this.state.winRate,
      assets: this.calculateAssetAllocation(),
      lastUpdated: new Date().toISOString(),
    };
  }

  private calculateTotalValue(): number {
    let openPositionsValue = 0;
    
    this.state.openTrades.forEach(trade => {
      const currentPrice = this.priceFeed[trade.pair] || trade.entryPrice;
      const positionValue = trade.amount * currentPrice;
      openPositionsValue += positionValue;
    });
    
    return this.state.balance + openPositionsValue;
  }

  private calculateAssetAllocation(): Record<string, number> {
    const allocation: Record<string, number> = {};
    const totalValue = this.calculateTotalValue();
    
    // Add cash
    allocation.USD = (this.state.balance / totalValue) * 100;
    
    // Add open positions
    this.state.openTrades.forEach(trade => {
      const [base] = trade.pair.split('/');
      const currentPrice = this.priceFeed[trade.pair] || trade.entryPrice;
      const positionValue = trade.amount * currentPrice;
      
      allocation[base] = (allocation[base] || 0) + (positionValue / totalValue) * 100;
    });
    
    return allocation;
  }

  public getState(): PaperTradingState {
    return { ...this.state };
  }

  public getStatus(): BotStatus {
    return { ...this.status };
  }

  public getOpenTrades(): PaperTrade[] {
    return [...this.state.openTrades];
  }

  public getClosedTrades(limit: number = 50): PaperTrade[] {
    return [...this.state.closedTrades]
      .sort((a, b) => new Date(b.exitTime!).getTime() - new Date(a.exitTime!).getTime())
      .slice(0, limit);
  }

  public reset(initialBalance: number = INITIAL_BALANCE): void {
    this.state = this.initializeState(initialBalance);
    this.status = this.initializeStatus();
  }
}

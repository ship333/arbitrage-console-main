import { Strategy } from './index';

// Pool addresses from the requirements
const POOLS = {
  // Khype/wHYPE pools
  'khype-whype-prjx': '0xbe352daF66af94ccF2012a154a67DAEF95FAcB91',
  'khype-whype-hyperswap': '0x5Cbe810071DE393de35e574Fb2830E16dA794bab',
  'khype-whype-hybra': '0xf37BEFa5De220E52fb06b02087f5Ba650377d0ad',
  
  // uBTC pools
  'ubtc-usdc-hyperliquid': '0x33a25c340fe5599bd35f07ac13c1e017',
  'ubtc-whype-hyperswap': '0x3A36B04bcC1D5E2E303981eF643D2668E00b43e7',
  'ubtc-whype-prjx': '0x0D6ECB912b6ee160e95Bc198b618Acc1bCb92525',
  'ubtc-whype-hybra': '0x43779F5E56720FbD7F99a18ca4B625838bEC934C',
  
  // uETH pools
  'ueth-usdc-hyperliquid': '0xb9f2e2b5af029e9ad090269dad41c4df',
  'ueth-whype-hyperswap': '0x719D7F4388cb0eFb6A48F3c3266e443edCE6588a',
  'ueth-whype-prjx': '0xaf80230eB13222DB743C21762f65A046bb5F5437',
  'ueth-whype-hybra': '0xA90d4Bc085fF2304F786f9F1633f3Cd508182AcA',
  
  // HYPE/wHYPE pools
  'hype-whype-hyperswap': '0x337b56d87A6185cD46AF3Ac2cDF03CBC37070C30',
  'hype-whype-hybra': '0x3603ffEbB994CC110b4186040CaC3005B2cf4465'
} as const;

export const arbitrageStrategy: Strategy = {
  id: 'arbitrage-v1',
  name: 'Cross-DEX Arbitrage',
  description: 'Executes trades when price differences between DEXs exceed threshold',
  category: 'arbitrage',
  parameters: {
    minProfitability: {
      type: 'number',
      default: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: 'Minimum Profitability (%)',
      description: 'Minimum price difference percentage to trigger a trade'
    },
    maxSlippage: {
      type: 'number',
      default: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: 'Max Slippage (%)',
      description: 'Maximum allowed slippage per trade'
    },
    maxPositionSize: {
      type: 'number',
      default: 1000,
      min: 100,
      max: 10000,
      step: 100,
      label: 'Max Position Size (USD)',
      description: 'Maximum value to trade per opportunity'
    },
    gasPriceMultiplier: {
      type: 'number',
      default: 1.2,
      min: 1,
      max: 3,
      step: 0.1,
      label: 'Gas Price Multiplier',
      description: 'Multiplier for current gas price'
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  version: '1.0.0',
  tags: ['arbitrage', 'cross-dex', 'high-frequency']
};

export const getPoolAddress = (poolId: keyof typeof POOLS): string => {
  return POOLS[poolId];
};

export const getPoolByAddress = (address: string): keyof typeof POOLS | undefined => {
  return Object.entries(POOLS).find(([_, addr]) => addr.toLowerCase() === address.toLowerCase())?.[0] as keyof typeof POOLS;
};

export const getPoolTokens = (poolId: keyof typeof POOLS): { base: string; quote: string } => {
  const [base, quote] = poolId.split('-');
  return { base, quote };
};

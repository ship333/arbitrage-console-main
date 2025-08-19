'use client';

import { TradingProvider } from '@/features/trading';
import { TradingDashboard } from '@/features/trading/components';

const TradingPage = () => {
  return (
    <TradingProvider>
      <div className="container mx-auto py-6">
        <TradingDashboard />
      </div>
    </TradingProvider>
  );
};

export default TradingPage;

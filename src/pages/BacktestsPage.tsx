import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
const BacktestsTab = lazy(() => import('@/components/tabs/BacktestsTab').then(m => ({ default: m.BacktestsTab })));

const BacktestsPage = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Backtests</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}> 
        <BacktestsTab />
      </Suspense>
    </div>
  );
};

export default BacktestsPage;

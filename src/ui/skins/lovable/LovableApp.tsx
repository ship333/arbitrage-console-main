import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from './pages/Dashboard';
import { PaperTrading } from './pages/PaperTrading';
import { Calibration } from './pages/Calibration';
import NotFound from '@/pages/NotFound';
import { useEffect } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LovableApp = () => {
  // Add Lovable theme class to the root element
  useEffect(() => {
    document.documentElement.classList.add('lovable-theme');
    return () => {
      document.documentElement.classList.remove('lovable-theme');
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/paper-trading" element={<PaperTrading />} />
          <Route path="/calibration" element={<Calibration />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
};

export default LovableApp;

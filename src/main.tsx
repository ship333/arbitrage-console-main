import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '@/contexts/AppTheme';
import App from './App';
import './index.css';
import './styles/theme.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Create root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

// Render the app
root.render(
  <QueryClientProvider client={queryClient}>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </QueryClientProvider>
);

'use client';

import { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SkinProvider } from '@/ui/SkinProvider';
import { ThemeInitializer } from '@/components/ThemeInitializer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
  themeProps?: {
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
  };
}

export function AppProviders({ 
  children, 
  themeProps = {
    attribute: 'class',
    defaultTheme: 'system',
    enableSystem: true,
    disableTransitionOnChange: true,
  } 
}: AppProvidersProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <QueryClientProvider client={queryClient}>
        <SkinProvider>
          <ThemeInitializer>
            {children}
          </ThemeInitializer>
        </SkinProvider>
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </NextThemesProvider>
  );
}

export default AppProviders;

import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { AppThemeProvider, useAppTheme } from "@/contexts/AppTheme";
import { TradingLayout } from "@/components/TradingLayout";
import { LovableLayout } from "@/ui/skins/lovable/components/MainLayout";
import { NAV_ROUTES } from "@/lib/routes";
import { REQUIRE_AUTH } from "@/lib/env";
import ProtectedRoute from "@/components/ProtectedRoute";
const BotControlPage = lazy(() => import("@/pages/BotControlPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const BacktestsPage = lazy(() => import("@/pages/BacktestsPage"));
const StrategiesPage = lazy(() => import("@/pages/StrategiesPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder components for routes that don't have dedicated components yet
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-muted-foreground">This is a placeholder for the {title} page.</p>
  </div>
);

// Simple page fallback while chunks load
const PageLoader = () => (
  <div className="p-6 text-sm text-muted-foreground">Loading…</div>
);

// Component map for routes
const COMPONENT_MAP: Record<string, React.ComponentType> = {
  'Dashboard': DashboardPage,
  'Bot Control': BotControlPage,
  'Backtests': BacktestsPage,
  'Strategies': StrategiesPage,
  // Add other components here as they are created
};

// Create route components based on NAV_ROUTES
const routeComponents = NAV_ROUTES.map((route) => {
  const Component = COMPONENT_MAP[route.title] || (() => <Placeholder title={route.title} />);
  
  return {
    ...route,
    element: (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    )
  };
});

function AppInner() {
  const { skin } = useAppTheme();
  const Layout = skin === 'lovable' ? LovableLayout : TradingLayout;
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          } />

          {routeComponents.map(({ path, element }) => (
            <Route 
              key={path} 
              path={path} 
              element={
                REQUIRE_AUTH ? (
                  <ProtectedRoute>
                    <Layout>
                      {element}
                    </Layout>
                  </ProtectedRoute>
                ) : (
                  <Layout>
                    {element}
                  </Layout>
                )
              } 
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppThemeProvider>
      <TooltipProvider>
        <ThemeInitializer>
          <AppInner />
        </ThemeInitializer>
      </TooltipProvider>
    </AppThemeProvider>
  </QueryClientProvider>
);

export default App;

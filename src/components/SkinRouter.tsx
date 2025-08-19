import { useSkin } from '@/contexts/SkinContext';
import { Suspense, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/ui/skins/lovable/components/LoadingSpinner';
import { ROUTES, getCurrentRoute } from '@/lib/routes';

// Layouts
import { TradingLayout } from './TradingLayout';
import { LovableLayout } from '@/ui/skins/lovable/components/MainLayout';

export function SkinRouter() {
  const { skin } = useSkin();
  const location = useLocation();
  
  // Get the current route based on pathname and skin
  const currentRoute = useMemo(() => {
    return getCurrentRoute(location.pathname, skin);
  }, [location.pathname, skin]);

  // Filter routes for the current skin
  const skinRoutes = useMemo(() => {
    return ROUTES.filter(route => route.skin === skin || route.skin === 'both');
  }, [skin]);

  // Determine the layout based on the skin
  const Layout = skin === 'lovable' ? LovableLayout : TradingLayout;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Layout>
        <Routes>
          {skinRoutes.map((route) => (
            <Route 
              key={route.path} 
              path={route.path} 
              element={route.element} 
            />
          ))}
        </Routes>
      </Layout>
    </Suspense>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { useSkin } from '@/contexts/SkinContext';

type RouteMap = {
  [key: string]: {
    classic: string;
    lovable: string;
  };
};

// Map between classic and lovable routes
const ROUTE_MAP: RouteMap = {
  // Dashboard
  '/': { classic: '/', lovable: '/dashboard' },
  '/dashboard': { classic: '/', lovable: '/dashboard' },
  
  // Paper Trading / Bot Control
  '/paper-trading': { classic: '/', lovable: '/paper-trading' },
  
  // Activity
  '/activity': { classic: '/activity', lovable: '/dashboard?tab=activity' },
  
  // Settings / Calibration
  '/settings': { classic: '/settings', lovable: '/calibration' },
  '/calibration': { classic: '/settings', lovable: '/calibration' },
  
  // Logs
  '/logs': { classic: '/logs', lovable: '/dashboard?tab=logs' },
} as const;

export function useSkinAwareNavigation() {
  const { skin } = useSkin();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the current route in the target skin
  const getRouteInSkin = (targetSkin: 'classic' | 'lovable') => {
    const currentPath = location.pathname;
    // Find the route mapping for the current path
    const [mapping] = Object.entries(ROUTE_MAP).find(([path]) => 
      path === currentPath || currentPath.startsWith(path)
    ) || [];
    
    if (mapping) {
      return ROUTE_MAP[mapping][targetSkin];
    }
    
    // Default to root if no mapping found
    return targetSkin === 'classic' ? '/' : '/dashboard';
  };
  
  // Navigate to a route in the current skin
  const navigateTo = (path: string) => {
    if (path.startsWith('http')) {
      window.location.href = path;
      return;
    }
    
    // If the path exists in our route map, use the mapped path for the current skin
    const mappedPath = ROUTE_MAP[path as keyof typeof ROUTE_MAP]?.[skin] || path;
    navigate(mappedPath);
  };
  
  // Get the current path in the other skin
  const getOtherSkinPath = () => {
    const otherSkin = skin === 'classic' ? 'lovable' : 'classic';
    return getRouteInSkin(otherSkin);
  };
  
  return {
    skin,
    currentPath: location.pathname,
    navigateTo,
    getRouteInSkin,
    getOtherSkinPath,
  };
}

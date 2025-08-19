import { lazy, ComponentType } from 'react';

// Type for route configuration
export interface RouteConfig {
  path: string;
  title: string;
  icon: string;
  sidebar?: boolean;
}

// Navigation routes for the application
export const NAV_ROUTES: RouteConfig[] = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    sidebar: true,
    icon: 'dashboard',
  },
  {
    path: '/backtests',
    title: 'Backtests',
    sidebar: true,
    icon: 'line-chart',
  },
  {
    path: '/',
    title: 'Bot Control',
    sidebar: true,
    icon: 'bot',
  },
  {
    path: '/strategies',
    title: 'Strategies',
    sidebar: true,
    icon: 'lightbulb',
  },
  {
    path: '/activity',
    title: 'Activity',
    sidebar: true,
    icon: 'activity',
  },
  {
    path: '/logs',
    title: 'Logs',
    sidebar: true,
    icon: 'file-text',
  },
  {
    path: '/settings',
    title: 'Settings',
    sidebar: true,
    icon: 'settings',
  },
];

// Helper function to check if a route is active
export const isRouteActive = (pathname: string, path: string) => {
  if (path === '/') {
    return pathname === path;
  }
  return pathname.startsWith(path);
};

// Get navigation items for the current skin
export function getNavItems() {
  return NAV_ROUTES.filter(route => route.sidebar);
}

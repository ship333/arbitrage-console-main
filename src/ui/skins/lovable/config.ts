/**
 * Configuration for the Lovable skin
 */
import { getApiBaseUrl } from '@/lib/env';

export const LOVABLE_CONFIG = {
  // Feature flags
  features: {
    darkMode: true,
    notifications: true,
    analytics: true,
    realTimeUpdates: true,
  },
  
  // API endpoints
  api: {
    baseUrl: getApiBaseUrl(),
    endpoints: {
      metrics: '/metrics',
      opportunities: '/opportunities',
      bot: {
        start: '/bot/start',
        stop: '/bot/stop',
        status: '/bot/status',
      },
      calibration: {
        update: '/calibration/update',
        status: '/calibration/status',
      },
    },
    timeout: 10000, // 10 seconds
  },
  
  // UI constants
  ui: {
    theme: {
      primary: '#6E59F9',
      accent: '#22C55E',
      borderRadius: '1rem', // 16px
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  
  // Default values
  defaults: {
    pollingInterval: 5000, // 5 seconds
    maxRetries: 3,
    toastDuration: 5000, // 5 seconds
  },
} as const;

/**
 * Type for the Lovable config
 */
export type LovableConfig = typeof LOVABLE_CONFIG;

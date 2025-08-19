/**
 * DEPRECATED: Use helpers from `src/lib/env.ts` instead.
 * This file is retained for backward-compatibility with Lovable skin utilities
 * but should not be imported by new code.
 *
 * Gets the current skin from environment variables
 * @returns The current skin ('lovable' or 'classic')
 */
export function getCurrentSkin(): 'lovable' | 'classic' {
  const env = (import.meta as any)?.env || {};
  const skin = env.VITE_FRONTEND_SKIN || env.NEXT_PUBLIC_FRONTEND_SKIN || 'classic';
  return skin === 'lovable' ? 'lovable' : 'classic';
}

/**
 * Checks if the current skin is Lovable
 * @returns boolean indicating if the current skin is Lovable
 */
export function isLovableSkin(): boolean {
  return getCurrentSkin() === 'lovable';
}

/**
 * Validates the environment variables required for the Lovable skin
 * @throws Error if required environment variables are missing
 */
export function validateEnvironment(): void {
  const env = (import.meta as any)?.env || {};
  const required = env.VITE_API_URL || env.NEXT_PUBLIC_API_URL;
  const missingVars: string[] = [];
  if (!required) missingVars.push('VITE_API_URL');

  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars.join(', '));
    console.warn('Using default values which may not work in production.');
  }
}

/**
 * Gets the API base URL with a fallback
 * @returns The API base URL
 */
export function getApiBaseUrl(): string {
  const env = (import.meta as any)?.env || {};
  return env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || '/api';
}

/**
 * Gets the WebSocket URL with a fallback
 * @returns The WebSocket URL
 */
export function getWebSocketUrl(): string {
  const env = (import.meta as any)?.env || {};
  const fromEnv = env.VITE_WS_URL || env.NEXT_PUBLIC_WS_URL;
  const baseUrl = fromEnv || 
    (typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      : 'ws://localhost:3000');
  
  return `${baseUrl}/ws`;
}

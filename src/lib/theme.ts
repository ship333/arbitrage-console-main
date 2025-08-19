import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type Skin = 'classic' | 'lovable';

// Theme and skin persistence
export const themePersistence = {
  get: (): Theme => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
  },
  set: (theme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  },
};

export const skinPersistence = {
  get: (): Skin => {
    // Prefer explicit env override if provided
    const env = (import.meta as any)?.env || {};
    const envSkin = (env.NEXT_PUBLIC_FRONTEND_SKIN || env.VITE_FRONTEND_SKIN) as string | undefined;
    const validEnvSkin = envSkin === 'lovable' || envSkin === 'classic' ? (envSkin as Skin) : null;

    if (validEnvSkin) {
      // Sync persisted value with env to avoid confusion during dev
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('skin', validEnvSkin); } catch {}
      }
      return validEnvSkin;
    }

    // Otherwise, use persisted preference if available
    if (typeof window === 'undefined') return 'classic';
    const stored = localStorage.getItem('skin') as Skin | null;
    return stored || 'classic';
  },
  set: (skin: Skin) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('skin', skin);
    }
  },
};

/**
 * Hook to manage theme state
 */
export function useThemeState() {
  const [theme, setThemeState] = useState<Theme>(() => themePersistence.get());
  const [skin, setSkinState] = useState<Skin>(() => skinPersistence.get());

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    themePersistence.set(newTheme);
  };

  const setSkin = (newSkin: Skin) => {
    setSkinState(newSkin);
    skinPersistence.set(newSkin);
  };

  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Apply theme and skin to the document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Apply skin
    root.setAttribute('data-skin', skin);
    
    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        getComputedStyle(root).getPropertyValue('--color-background').trim()
      );
    }
  }, [theme, skin]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setTheme('system');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    skin,
    setTheme,
    setSkin,
    isDark,
  };
}

/**
 * Get theme-aware CSS variable value
 */
export function getThemeVar(name: string, element: HTMLElement = document.documentElement) {
  return getComputedStyle(element).getPropertyValue(`--${name}`).trim();
}

/**
 * Set theme-aware CSS variable
 */
export function setThemeVar(name: string, value: string, element: HTMLElement = document.documentElement) {
  element.style.setProperty(`--${name}`, value);
}

/**
 * Create theme-aware styles for CSS-in-JS
 */
export function createThemedStyles(styles: Record<string, any>) {
  return (theme: string) => ({
    ...styles.base,
    ...(theme === 'dark' ? styles.dark : styles.light),
  });
}

/**
 * Get theme-aware color
 */
export function getThemeColor(name: string) {
  return `hsl(var(--${name}) / <alpha-value>)`;
}

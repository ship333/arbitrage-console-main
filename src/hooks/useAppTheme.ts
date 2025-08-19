import { useTheme as useNextTheme } from 'next-themes';
import { useSkin } from '@/contexts/SkinContext';
import { useEffect, useMemo } from 'react';

/**
 * A custom hook that provides access to both theme and skin contexts
 * with additional utilities for theme manipulation
 */
export function useAppTheme() {
  const skinContext = useSkin();
  const { theme, setTheme, systemTheme } = useNextTheme();
  
  // Determine the effective theme (accounting for system preference)
  const effectiveTheme = useMemo(() => {
    return theme === 'system' ? systemTheme || 'light' : theme;
  }, [theme, systemTheme]);
  
  // Check if dark mode is active
  const isDark = useMemo(() => {
    return effectiveTheme === 'dark';
  }, [effectiveTheme]);
  
  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };
  
  // Get theme color value by name
  const getThemeColor = (colorName: string) => {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(`--${colorName}`).trim();
    return value || `var(--${colorName})`;
  };
  
  // Apply theme class to body for global styles
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme class
    root.classList.remove('light', 'dark');
    if (effectiveTheme) {
      root.classList.add(effectiveTheme);
    }
    
    // Set data-theme attribute for CSS variables
    root.setAttribute('data-theme', effectiveTheme || 'light');
    
    // Set meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const bgColor = getComputedStyle(root)
        .getPropertyValue('--background')
        .trim();
      metaThemeColor.setAttribute('content', bgColor);
    }
    
    // Cleanup
    return () => {
      root.classList.remove('light', 'dark');
      root.removeAttribute('data-theme');
    };
  }, [effectiveTheme]);
  
  return {
    // Theme properties
    theme,
    systemTheme,
    effectiveTheme,
    isDark,
    setTheme,
    toggleTheme,
    
    // Skin properties
    skin: skinContext.skin,
    setSkin: skinContext.setSkin,
    toggleSkin: skinContext.toggleSkin,
    
    // Utilities
    getThemeColor,
  };
}

/**
 * A simpler version of the hook that only returns theme-related values
 * Use this when you only need theme information
 */
export function useTheme() {
  const { theme, systemTheme, effectiveTheme, isDark, setTheme, toggleTheme } = useAppTheme();
  return { theme, systemTheme, effectiveTheme, isDark, setTheme, toggleTheme };
}

/**
 * A simpler version of the hook that only returns skin-related values
 * Use this when you only need skin information
 */
export function useAppSkin() {
  const { skin, setSkin, toggleSkin } = useAppTheme();
  return { skin, setSkin, toggleSkin };
}

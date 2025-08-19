import { useEffect } from 'react';
import { useAppTheme } from '@/contexts/AppTheme';

interface ThemeInitializerProps {
  children: React.ReactNode;
}

export function ThemeInitializer({ children }: ThemeInitializerProps) {
  const { theme, skin, isDark } = useAppTheme();

  // Apply theme and skin classes to the document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme class
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Apply skin attribute
    root.setAttribute('data-skin', skin);

    // Update theme color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const bg = getComputedStyle(root).getPropertyValue('--background').trim();
      // Compose as hsl() so meta accepts a valid color string
      metaThemeColor.setAttribute('content', `hsl(${bg})`);
    }
  }, [theme, skin, isDark]);

  return <>{children}</>;
}

export default ThemeInitializer;

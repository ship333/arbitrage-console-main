import { createContext, useContext, ReactNode } from 'react';
import { useThemeState, type Theme, type Skin } from '@/lib/theme';

interface AppThemeContextType extends ReturnType<typeof useThemeState> {
  toggleTheme: () => void;
  toggleSkin: () => void;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const themeState = useThemeState();
  
  const toggleTheme = () => {
    themeState.setTheme(
      themeState.theme === 'dark' 
        ? 'light' 
        : themeState.theme === 'light' 
          ? 'system' 
          : 'dark'
    );
  };

  const toggleSkin = () => {
    themeState.setSkin(
      themeState.skin === 'classic' ? 'lovable' : 'classic'
    );
  };

  return (
    <AppThemeContext.Provider
      value={{
        ...themeState,
        toggleTheme,
        toggleSkin,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
}

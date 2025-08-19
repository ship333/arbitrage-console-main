const STORAGE_KEYS = {
  THEME: 'arbitrage-theme',
  SKIN: 'arbitrage-skin',
  LAYOUT: 'arbitrage-layout',
} as const;

type ThemePreference = 'light' | 'dark' | 'system';
type SkinPreference = 'classic' | 'lovable';

// Theme persistence
export const themePersistence = {
  get: (): ThemePreference => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemePreference) || 'system';
  },
  set: (theme: ThemePreference) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }
  },
};

// Skin persistence
export const skinPersistence = {
  get: (): SkinPreference => {
    if (typeof window === 'undefined') return 'classic';
    return (localStorage.getItem(STORAGE_KEYS.SKIN) as SkinPreference) || 'classic';
  },
  set: (skin: SkinPreference) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SKIN, skin);
    }
  },
};

// Layout state persistence
export const layoutPersistence = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(`${STORAGE_KEYS.LAYOUT}:${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Error reading layout state:', error);
      return defaultValue;
    }
  },
  set: (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEYS.LAYOUT}:${key}`, JSON.stringify(value));
      } catch (error) {
        console.warn('Error saving layout state:', error);
      }
    }
  },
};

// Initialize theme on load
if (typeof window !== 'undefined') {
  const savedTheme = themePersistence.get();
  const savedSkin = skinPersistence.get();
  
  // Apply saved theme
  if (savedTheme === 'dark' || 
      (savedTheme === 'system' && 
       window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Apply saved skin
  document.documentElement.setAttribute('data-skin', savedSkin);
}

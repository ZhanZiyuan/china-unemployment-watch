'use client';

import * as React from 'react';

type Theme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
};

const STORAGE_KEY = 'theme';
const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  React.useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      setTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', syncTheme);
    return () => mediaQuery.removeEventListener('change', syncTheme);
  }, []);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

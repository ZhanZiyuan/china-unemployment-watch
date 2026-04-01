'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';

type Theme = 'dark' | 'light';
type ThemeTransitionOrigin = {
  x: number;
  y: number;
};

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme, origin?: ThemeTransitionOrigin) => void;
};

const STORAGE_KEY = 'theme';
const FALLBACK_TRANSITION_CLASS = 'theme-fallback-transition';
const THEME_TRANSITION_DURATION_MS = 450;
const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

type ViewTransition = {
  ready: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransition;
};

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

function persistTheme(theme: Theme) {
  window.localStorage.setItem(STORAGE_KEY, theme);
}

function commitTheme(theme: Theme, setThemeState: React.Dispatch<React.SetStateAction<Theme>>) {
  flushSync(() => {
    setThemeState(theme);
  });
  applyTheme(theme);
  persistTheme(theme);
}

function runFallbackTransition(theme: Theme, setThemeState: React.Dispatch<React.SetStateAction<Theme>>) {
  const root = document.documentElement;
  root.classList.add(FALLBACK_TRANSITION_CLASS);
  commitTheme(theme, setThemeState);

  window.setTimeout(() => {
    root.classList.remove(FALLBACK_TRANSITION_CLASS);
  }, THEME_TRANSITION_DURATION_MS);
}

function canUseThemeTransition() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  return typeof (document as DocumentWithViewTransition).startViewTransition === 'function';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      setThemeState(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', syncTheme);
    return () => mediaQuery.removeEventListener('change', syncTheme);
  }, []);

  const setTheme = React.useCallback(
    (nextTheme: Theme, origin?: ThemeTransitionOrigin) => {
      if (nextTheme === theme) {
        return;
      }

      if (!canUseThemeTransition()) {
        runFallbackTransition(nextTheme, setThemeState);
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = (document as DocumentWithViewTransition).startViewTransition?.(() => {
        commitTheme(nextTheme, setThemeState);
      });

      transition?.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];

        document.documentElement.animate(
          {
            clipPath: nextTheme === 'dark' ? clipPath : [...clipPath].reverse(),
          },
          {
            duration: THEME_TRANSITION_DURATION_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement:
              nextTheme === 'dark'
                ? '::view-transition-new(root)'
                : '::view-transition-old(root)',
          },
        );
      });
    },
    [theme],
  );

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

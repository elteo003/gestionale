import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function per ottenere il tema iniziale
function getInitialTheme(): Theme {
  // Valida e restituisce il tema salvato
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') {
    return saved as Theme;
  }

  // Usa system preference come fallback
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// Applica il tema immediatamente al DOM (previene FOUC)
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Applica il tema iniziale PRIMA del primo render
applyTheme(getInitialTheme());

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  // useLayoutEffect per applicare il tema sincronamente prima del paint
  useLayoutEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    setIsInitialized(true);
  }, [theme]);

  // Sincronizzazione con preferenze di sistema (solo se non c'è preferenza salvata)
  useEffect(() => {
    if (!isInitialized) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Aggiorna solo se non c'è preferenza salvata
      const saved = localStorage.getItem('theme');
      if (!saved || (saved !== 'dark' && saved !== 'light')) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    // Supporta sia addEventListener che addListener (per compatibilità)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback per browser vecchi
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [isInitialized]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      // Salva immediatamente per prevenire problemi
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};


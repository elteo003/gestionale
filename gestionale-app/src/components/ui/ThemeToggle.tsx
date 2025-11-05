import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Passa a modalità ${theme === 'light' ? 'scura' : 'chiara'}`}
      className="transition-all duration-300 hover:scale-110"
      title={theme === 'light' ? 'Attiva modalità scura' : 'Attiva modalità chiara'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
      ) : (
        <Sun className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
      )}
    </Button>
  );
};


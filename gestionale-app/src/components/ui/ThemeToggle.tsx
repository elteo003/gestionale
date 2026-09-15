import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export const ThemeToggle: React.FC = () => {
  const { theme, toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={`Passa a modalità ${theme === 'light' ? 'scura' : 'chiara'}`}
      className={cn(
        'pressable',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800'
      )}
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

import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    toggleTheme();
    // Reset animazione dopo la transizione
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      aria-label={`Passa a modalità ${theme === 'light' ? 'scura' : 'chiara'}`}
      className={cn(
        'relative transition-transform duration-200',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800'
      )}
      title={theme === 'light' ? 'Attiva modalità scura' : 'Attiva modalità chiara'}
    >
      {theme === 'light' ? (
        <Moon 
          className={cn(
            'w-5 h-5 text-neutral-700 dark:text-neutral-300',
            'transition-transform duration-300',
            isAnimating && 'rotate-12'
          )} 
        />
      ) : (
        <Sun 
          className={cn(
            'w-5 h-5 text-neutral-700 dark:text-neutral-300',
            'transition-transform duration-300',
            isAnimating && 'rotate-12'
          )} 
        />
      )}
    </Button>
  );
};


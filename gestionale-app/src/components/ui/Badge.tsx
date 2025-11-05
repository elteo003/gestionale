import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const variantStyles = {
  default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
  success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800',
  error: 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 border-error-200 dark:border-error-800',
  warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-800',
  info: 'bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-400 border-info-200 dark:border-info-800',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'default' && 'bg-neutral-500 dark:bg-neutral-400',
            variant === 'success' && 'bg-success-600 dark:bg-success-500',
            variant === 'error' && 'bg-error-600 dark:bg-error-500',
            variant === 'warning' && 'bg-warning-600 dark:bg-warning-500',
            variant === 'info' && 'bg-info-600 dark:bg-info-500'
          )}
        />
      )}
      {children}
    </span>
  );
};


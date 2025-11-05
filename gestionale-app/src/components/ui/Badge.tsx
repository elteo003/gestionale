import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const variantStyles = {
  default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  success: 'bg-success-100 text-success-700 border-success-200',
  error: 'bg-error-100 text-error-700 border-error-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  info: 'bg-info-100 text-info-700 border-info-200',
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
            variant === 'default' && 'bg-neutral-500',
            variant === 'success' && 'bg-success-600',
            variant === 'error' && 'bg-error-600',
            variant === 'warning' && 'bg-warning-600',
            variant === 'info' && 'bg-info-600'
          )}
        />
      )}
      {children}
    </span>
  );
};


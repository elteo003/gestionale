import React, { forwardRef } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  fullWidth?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      fullWidth = false,
      placeholder,
      className,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
            {required && <span className="text-error-600 dark:text-error-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full px-4 py-2 pr-10',
              'border rounded-lg',
              'text-base text-neutral-900 dark:text-neutral-100',
              'bg-white dark:bg-neutral-800 appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'transition-colors duration-200',
              'disabled:bg-neutral-50 dark:disabled:bg-neutral-900 disabled:text-neutral-500 dark:disabled:text-neutral-600 disabled:cursor-not-allowed',
              error
                ? 'border-error-600 dark:border-error-500 focus:ring-error-500 dark:focus:ring-error-400 focus:border-error-600 dark:focus:border-error-500'
                : 'border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-600 dark:focus:border-primary-500',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperId}
            aria-required={required}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-500">
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          </div>

          {error && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 text-error-600 dark:text-error-400">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            className="text-sm text-error-600 dark:text-error-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-sm text-neutral-500 dark:text-neutral-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';


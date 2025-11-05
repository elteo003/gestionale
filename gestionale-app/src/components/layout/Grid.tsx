import React from 'react';
import { cn } from '../../utils/cn';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4 | 6;
    lg?: 1 | 2 | 3 | 4 | 6 | 12;
  };
}

const gapStyles = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const colStyles = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  gap = 'md',
  responsive,
  className,
  children,
  ...props
}) => {
  const responsiveClasses = responsive
    ? [
        responsive.sm && `sm:grid-cols-${responsive.sm}`,
        responsive.md && `md:grid-cols-${responsive.md}`,
        responsive.lg && `lg:grid-cols-${responsive.lg}`,
      ].filter(Boolean).join(' ')
    : colStyles[cols];

  return (
    <div
      className={cn(
        'grid',
        !responsive && colStyles[cols],
        responsiveClasses,
        gapStyles[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};


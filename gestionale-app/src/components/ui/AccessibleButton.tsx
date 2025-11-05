import React from 'react';
import { Button, type ButtonProps } from './Button';

/**
 * Wrapper per Button con accessibilità migliorata
 */
export interface AccessibleButtonProps extends ButtonProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  children,
  ...props
}) => {
  return (
    <Button
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      {...props}
    >
      {children}
    </Button>
  );
};


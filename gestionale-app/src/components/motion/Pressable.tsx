import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type PressableProps = Omit<
    ComponentPropsWithoutRef<'button'>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
> & {
    children: ReactNode;
    className?: string;
};

/** Tactile press — CSS hover/active, no spring chasing the pointer. */
export function Pressable({ children, className = '', disabled, ...rest }: PressableProps) {
    return (
        <button type="button" className={`pressable ${className}`.trim()} disabled={disabled} {...rest}>
            {children}
        </button>
    );
}

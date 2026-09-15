import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    children: ReactNode;
    variant?: 'ghost' | 'soft' | 'solid';
    active?: boolean;
}

const variants: Record<string, string> = {
    ghost: 'text-ink-muted hover:bg-surface-inset hover:text-ink',
    soft:  'bg-surface-inset text-ink-muted hover:text-ink border border-line/60',
    solid: 'bg-grad-brand text-white shadow-glow-brand',
};

export function IconButton({
    label, children, variant = 'ghost', active = false, className = '', ...rest
}: IconButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors
                        ${active ? variants.solid : variants[variant]} ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
}

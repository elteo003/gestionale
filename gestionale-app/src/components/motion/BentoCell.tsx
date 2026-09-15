import type { ReactNode } from 'react';

interface BentoCellProps {
    children: ReactNode;
    className?: string;
}

/** Bento grid cell — content is already in place; page-enter owns the route fade. */
export function BentoCell({ children, className = '' }: BentoCellProps) {
    return <div className={`h-full min-h-0 ${className}`}>{children}</div>;
}

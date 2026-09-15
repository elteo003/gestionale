import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp } from '../../motion/variants';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface BentoCellProps {
    children: ReactNode;
    className?: string;
}

/** Bento grid cell — enters with the dashboard stagger, no competing fades. */
export function BentoCell({ children, className = '' }: BentoCellProps) {
    const reduced = useReducedMotion();

    if (reduced) {
        return <div className={`h-full min-h-0 ${className}`}>{children}</div>;
    }

    return (
        <motion.div className={`h-full min-h-0 ${className}`} variants={fadeUp}>
            {children}
        </motion.div>
    );
}

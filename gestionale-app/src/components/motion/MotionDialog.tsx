import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { fade, scaleIn } from '../../motion/variants';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface MotionDialogProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    labelledBy?: string;
}

/** Modal shell — backdrop dims, panel scales in (context: overlay action). */
export function MotionDialog({ open, onClose, children, className = '', labelledBy }: MotionDialogProps) {
    const reduced = useReducedMotion();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const previousOverflow = document.body.style.overflow;
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    key="motion-dialog"
                    className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={labelledBy}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.15, ease: [0.19, 1, 0.22, 1] }}
                >
                    <motion.button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                        variants={fade}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={reduced ? { duration: 0 } : undefined}
                        onClick={onClose}
                        aria-label="Chiudi"
                    />
                    <motion.div
                        className={className}
                        variants={scaleIn}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={reduced ? { duration: 0 } : undefined}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}

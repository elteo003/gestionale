import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { MotionDialog } from './motion/MotionDialog';

export function AppModal({
    isOpen, onClose, children,
}: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
    return (
        <MotionDialog
            open={isOpen}
            onClose={onClose}
            className="relative card max-w-lg w-full max-h-[90vh] overflow-y-auto"
        >
            <button onClick={onClose} className="absolute top-3 right-3 icon-btn z-10" aria-label="Chiudi">
                <X className="w-4 h-4" />
            </button>
            <div className="p-6 pr-12">{children}</div>
        </MotionDialog>
    );
}

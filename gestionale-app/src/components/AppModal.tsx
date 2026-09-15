import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function AppModal({
    isOpen, onClose, children,
}: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
    useEffect(() => {
        if (!isOpen) return;

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
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                <button onClick={onClose} className="absolute top-3 right-3 icon-btn z-10" aria-label="Chiudi">
                    <X className="w-4 h-4" />
                </button>
                <div className="p-6 pr-12">{children}</div>
            </div>
        </div>,
        document.body,
    );
}

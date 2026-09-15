import {
    useEffect,
    useLayoutEffect,
    useState,
    type CSSProperties,
    type ReactNode,
    type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export type DropdownOrigin =
    | 'top'
    | 'top-right'
    | 'top-left'
    | 'bottom'
    | 'bottom-right'
    | 'bottom-left';

type Align = 'stretch' | 'end' | 'start';
type Side = 'bottom' | 'top';

interface DropdownPanelProps {
    open: boolean;
    triggerRef: RefObject<HTMLElement | null>;
    origin?: DropdownOrigin;
    align?: Align;
    side?: Side;
    gap?: number;
    className?: string;
    children: ReactNode;
    role?: string;
    id?: string;
}

const CLOSE_MS = 180;

function place(
    rect: DOMRect,
    align: Align,
    side: Side,
    gap: number,
): CSSProperties {
    const style: CSSProperties = { position: 'fixed', zIndex: 90 };
    if (side === 'bottom') {
        style.top = rect.bottom + gap;
        style.maxHeight = Math.max(120, window.innerHeight - rect.bottom - gap - 12);
    } else {
        style.bottom = window.innerHeight - rect.top + gap;
        style.maxHeight = Math.max(120, rect.top - gap - 12);
    }
    if (align === 'stretch') {
        style.left = rect.left;
        style.width = rect.width;
    } else if (align === 'end') {
        style.right = window.innerWidth - rect.right;
    } else {
        style.left = rect.left;
    }
    return style;
}

/**
 * Overlay menu — portaled to body so clip-path is not trapped in
 * backdrop-filter / overflow ancestors. Unfolds from the trigger via clip-path.
 */
export function DropdownPanel({
    open,
    triggerRef,
    origin = 'top-right',
    align = 'end',
    side = 'bottom',
    gap = 8,
    className = '',
    children,
    role = 'menu',
    id,
}: DropdownPanelProps) {
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);
    const [, setTick] = useState(0);

    useEffect(() => {
        if (open) {
            setMounted(true);
            return;
        }
        setVisible(false);
        if (!mounted) return;
        const t = window.setTimeout(() => setMounted(false), CLOSE_MS);
        return () => window.clearTimeout(t);
    }, [open, mounted]);

    useEffect(() => {
        if (!open || !mounted) return;
        let cancelled = false;
        let inner = 0;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => {
                if (!cancelled) setVisible(true);
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(outer);
            cancelAnimationFrame(inner);
        };
    }, [open, mounted]);

    useLayoutEffect(() => {
        if (!open) return;
        const onMove = () => setTick((n) => n + 1);
        window.addEventListener('resize', onMove);
        window.addEventListener('scroll', onMove, true);
        return () => {
            window.removeEventListener('resize', onMove);
            window.removeEventListener('scroll', onMove, true);
        };
    }, [open]);

    if (!mounted || typeof document === 'undefined') return null;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return createPortal(
        <div
            id={id}
            role={role}
            aria-hidden={!visible}
            data-open={visible ? 'true' : 'false'}
            data-origin={origin}
            data-side={side}
            className="dropdown-panel"
            style={place(rect, align, side, gap)}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className={cn('dropdown-panel-body', className)}>{children}</div>
        </div>,
        document.body,
    );
}

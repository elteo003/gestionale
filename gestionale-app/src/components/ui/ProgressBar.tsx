import { useReducedMotion } from '../../motion/useReducedMotion';

type Tone = 'brand' | 'violet' | 'cyan' | 'pink' | 'emerald' | 'amber';

interface ProgressBarProps {
    value: number;
    max?: number;
    tone?: Tone;
    showLabel?: boolean;
    height?: 'thin' | 'normal' | 'thick';
}

const toneClass: Record<Tone, string> = {
    brand:   'bg-grad-brand-soft',
    violet:  'bg-grad-brand-soft',
    cyan:    'bg-grad-cyan',
    pink:    'bg-grad-emerald',
    emerald: 'bg-grad-emerald',
    amber:   'bg-amber-500',
};

const heights = { thin: 'h-1', normal: 'h-1.5', thick: 'h-2.5' };

export function ProgressFill({ pct, className = '' }: { pct: number; className?: string }) {
    const reduced = useReducedMotion();
    const scale = Math.max(0, Math.min(1, pct / 100));
    return (
        <div
            className={`h-full progress-fill ${className}`.trim()}
            style={{
                transform: `scaleX(${scale})`,
                transition: reduced ? 'none' : undefined,
            }}
        />
    );
}

export function ProgressBar({
    value, max = 100, tone = 'brand', showLabel = false, height = 'normal',
}: ProgressBarProps) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-ink-subtle">Avanzamento</span>
                    <span className="text-xs font-medium text-ink">{Math.round(pct)}%</span>
                </div>
            )}
            <div className={`progress-glass w-full overflow-hidden ${heights[height]}`}>
                <ProgressFill
                    pct={pct}
                    className={`${heights[height]} ${toneClass[tone]} progress-glass-fill rounded-full`}
                />
            </div>
        </div>
    );
}

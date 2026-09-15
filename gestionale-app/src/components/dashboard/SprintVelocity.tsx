import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { TRANSITION } from '../../motion/presets';
import { useReducedMotion } from '../../motion/useReducedMotion';
import type { Sprint } from '../../types/models';

interface SprintVelocityProps {
    sprint?: Sprint | null;
    history?: { label: string; value: number }[];
}

export function SprintVelocity({ sprint, history = [] }: SprintVelocityProps) {
    const reduced = useReducedMotion();
    const target = sprint?.targetPoints || 0;
    const completed = sprint?.completedPoints || 0;
    const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
    const radius = 56;
    const circ = Math.PI * radius;
    const offset = circ - (pct / 100) * circ;
    const maxHistory = Math.max(1, ...history.map(h => h.value));

    if (!sprint) {
        return (
            <Card variant="panel" title="Velocità sprint" subtitle="Nessuno sprint attivo">
                <p className="text-xs text-ink-subtle italic px-1 py-4">
                    Avvia uno sprint per vedere l’avanzamento.
                </p>
            </Card>
        );
    }

    return (
        <Card variant="panel" title="Velocità sprint" subtitle={sprint.name}>
            <div className="px-1 pt-1">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-3xl font-bold text-ink tabular-nums tracking-tight">
                        {pct}%
                    </span>
                </div>
                <p className="text-xs text-ink-subtle font-medium">
                    {completed} / {target} punti completati
                </p>
            </div>

            <div className="relative mt-3 flex items-end justify-center">
                <svg width={150} height={86} viewBox="0 0 150 86" className="overflow-visible" aria-hidden>
                    <defs>
                        <linearGradient id="velocity-grad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#1a7a55" />
                            <stop offset="100%" stopColor="#041f17" />
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 19 80 A ${radius} ${radius} 0 0 1 131 80`}
                        stroke="rgb(var(--line))"
                        strokeWidth={10}
                        fill="none"
                        strokeLinecap="round"
                    />
                    <motion.path
                        d={`M 19 80 A ${radius} ${radius} 0 0 1 131 80`}
                        stroke="url(#velocity-grad)"
                        strokeWidth={10}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        initial={false}
                        animate={{ strokeDashoffset: offset }}
                        transition={reduced ? { duration: 0 } : TRANSITION.fast}
                    />
                </svg>
                <div className="absolute inset-x-0 bottom-1 flex flex-col items-center pointer-events-none">
                    <span className="text-2xl font-bold text-ink tabular-nums leading-none">
                        {pct}%
                    </span>
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-2 flex items-end gap-2 h-6 px-2">
                    {history.map((h, i) => {
                        const barH = Math.max(8, (h.value / maxHistory) * 100);
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                <motion.div
                                    className="w-full rounded-full bg-brand-700/80 origin-bottom"
                                    initial={reduced ? false : { transform: 'scaleY(0)' }}
                                    animate={{ transform: 'scaleY(1)' }}
                                    transition={{ ...TRANSITION.fast, delay: reduced ? 0 : i * 0.03 }}
                                    style={{ height: `${barH}%` }}
                                />
                                <span className="text-[9px] text-ink-subtle uppercase font-medium">{h.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

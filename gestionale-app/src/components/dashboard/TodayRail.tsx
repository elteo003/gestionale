import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { ActivityList } from './ActivityFeed';
import type { Activity } from '../../types/models';

interface TodayEvent {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
}

interface TodayRailProps {
    activities: Activity[];
    events: TodayEvent[];
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function nextEvent(events: TodayEvent[]): TodayEvent | null {
    if (!events.length) return null;
    const now = Date.now();
    const upcoming = events
        .filter((e) => new Date(e.startTime).getTime() >= now - 45 * 60 * 1000)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (upcoming[0]) return upcoming[0];
    return [...events].sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null;
}

export function TodayRail({ activities, events }: TodayRailProps) {
    const navigate = useNavigate();
    const next = nextEvent(events);

    return (
        <section className="bento-panel h-full min-h-0 flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-ink tracking-tight">Oggi</h3>
                <p className="text-xs text-ink-subtle mt-0.5">Prossimo impegno e attività recenti</p>
            </div>

            <button
                type="button"
                onClick={() => navigate('/calendario')}
                className="mx-4 mb-3 rounded-xl border border-line/40 bg-surface-inset/70 px-3 py-2.5 text-left
                           hover:border-brand-600/30 transition-colors duration-150"
            >
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle font-semibold">Prossimo</p>
                {next ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-ink">
                        <Clock className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">
                            <span className="tabular-nums text-ink-muted mr-1.5">{fmtTime(next.startTime)}</span>
                            {next.title}
                        </span>
                    </p>
                ) : (
                    <p className="mt-1 text-xs text-ink-subtle">Nessun evento in programma</p>
                )}
            </button>

            <div className="px-4 pb-4 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <ActivityList activities={activities} maxItems={6} />
            </div>
        </section>
    );
}

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock } from 'lucide-react';
import { eventsAPI } from '../services/api';

interface SidebarCalendarProps {
    onOpenCalendar?: () => void;
    onQuickAction?: (title: string, message?: string) => void;
}

interface SidebarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function startOfWeek(d: Date) {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string) {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function mockUpcoming(): SidebarEvent[] {
    const today = new Date();
    const at = (offset: number, h: number, m = 0) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };
    return [
        { id: 's1', title: 'Sprint Review',         startTime: at(0, 12, 0), endTime: at(0, 13, 0) },
        { id: 's2', title: 'Client Sync · Dev.ai',  startTime: at(1, 10, 30), endTime: at(1, 11, 30) },
        { id: 's3', title: 'Design Critique',       startTime: at(2, 15, 0), endTime: at(2, 16, 0) },
    ];
}

export function SidebarCalendar({ onOpenCalendar, onQuickAction }: SidebarCalendarProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<SidebarEvent[]>([]);

    useEffect(() => {
        let cancelled = false;
        eventsAPI.getMyUpcoming()
            .then((data) => {
                if (cancelled) return;
                const list = Array.isArray(data) ? (data as any[]).map(e => ({
                    id: String(e.id ?? e.event_id ?? Math.random()),
                    title: e.title ?? 'Evento',
                    startTime: e.startTime ?? e.start_time ?? new Date().toISOString(),
                    endTime: e.endTime ?? e.end_time,
                })) : [];
                setEvents(list.length ? list : mockUpcoming());
            })
            .catch(() => {
                if (!cancelled) setEvents(mockUpcoming());
            });
        return () => { cancelled = true; };
    }, []);

    const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    }), [weekStart]);

    const eventsByDay = useMemo(() => {
        const map = new Map<string, SidebarEvent[]>();
        events.forEach(e => {
            const key = new Date(e.startTime).toDateString();
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(e);
        });
        return map;
    }, [events]);

    const upcoming = useMemo(() => {
        const now = Date.now();
        return [...events]
            .filter(e => new Date(e.startTime).getTime() >= now - 1000 * 60 * 60)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .slice(0, 3);
    }, [events]);

    const monthLabel = selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    return (
        <div className="mx-3 mb-2 rounded-2xl bg-surface-inset/50 border border-line/40 p-3">
            <button
                type="button"
                onClick={onOpenCalendar}
                className="w-full flex items-center justify-between mb-2 group"
                aria-label="Apri calendario"
            >
                <span className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-brand-400" />
                    <span className="text-[12px] font-semibold text-ink">Calendario</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-ink-subtle group-hover:text-ink transition-colors" />
            </button>

            <p className="text-[10px] tracking-[0.16em] text-ink-subtle font-semibold mb-1.5 capitalize">
                {monthLabel}
            </p>

            <div className="grid grid-cols-7 gap-0.5 mb-2">
                    {DAY_LABELS.map(l => (
                        <span
                            key={l}
                            className="text-[8px] uppercase text-ink-subtle text-center font-semibold tracking-wider py-0.5"
                        >
                            {l}
                        </span>
                    ))}
                    {days.map(d => {
                        const selected = isSameDay(d, selectedDate);
                        const hasEvents = (eventsByDay.get(d.toDateString())?.length ?? 0) > 0;
                        return (
                            <button
                                key={d.toISOString()}
                                type="button"
                                onClick={() => setSelectedDate(d)}
                                className={`relative aspect-square flex items-center justify-center
                                            rounded-md text-[11px] font-semibold tabular-nums
                                            ${selected
                                                ? 'text-white bg-grad-brand shadow-glow-brand'
                                                : 'text-ink-muted hover:text-ink hover:bg-surface-raised/40'}`}
                            >
                                <span className="relative z-10">{d.getDate()}</span>
                                {hasEvents && !selected && (
                                    <span
                                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2
                                                   w-1 h-1 rounded-full bg-brand-400"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

            {upcoming.length > 0 && (
                <div className="mt-2 pt-2 border-t border-line/30 space-y-1">
                    {upcoming.map(e => (
                        <button
                            key={e.id}
                            type="button"
                            onClick={() => onQuickAction?.(e.title, `${fmtDay(e.startTime)} · ${fmtTime(e.startTime)}${e.endTime ? ' - ' + fmtTime(e.endTime) : ''}`)}
                            className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md
                                       hover:bg-surface-raised/40 transition-colors text-left"
                        >
                            <span className="w-1 h-6 rounded-full flex-shrink-0 bg-brand-600" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-ink truncate leading-tight">
                                    {e.title}
                                </p>
                                <p className="text-[9px] text-ink-subtle mt-0.5 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {fmtDay(e.startTime)} · {fmtTime(e.startTime)}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

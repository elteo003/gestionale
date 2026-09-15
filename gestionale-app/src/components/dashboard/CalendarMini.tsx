import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Clock } from 'lucide-react';
import { openNotice } from '../../utils/notice';

interface MiniEvent {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
}

interface CalendarMiniProps {
    events: MiniEvent[];
    selectedDate?: Date;
    onSelectDate?: (d: Date) => void;
}

const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

function startOfWeek(d: Date) {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function CalendarMini({ events, selectedDate = new Date(), onSelectDate }: CalendarMiniProps) {
    const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);

    const days = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
        });
    }, [weekStart]);

    const todayEvents = useMemo(() => {
        return events
            .filter(e => isSameDay(new Date(e.startTime), selectedDate))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [events, selectedDate]);

    return (
        <Card variant="panel" title="Calendario" bodyClassName="pt-1">
            <div className="grid grid-cols-7 gap-1.5 mb-4">
                {days.map(d => {
                    const selected = isSameDay(d, selectedDate);
                    return (
                        <button
                            key={d.toISOString()}
                            type="button"
                            onClick={() => onSelectDate?.(d)}
                            className={`relative flex flex-col items-center justify-center
                                        rounded-xl py-2 overflow-hidden
                                        ${selected
                                            ? 'text-white bg-grad-brand shadow-glow-brand'
                                            : 'bg-surface-inset/60 border border-line/40 text-ink hover:border-brand-600/30'}`}
                        >
                            <span
                                className={`relative z-10 text-[15px] font-bold tabular-nums leading-none
                                            ${selected ? 'text-white' : 'text-ink'}`}
                            >
                                {d.getDate()}
                            </span>
                            <span
                                className={`relative z-10 text-[9px] uppercase mt-1 font-semibold tracking-wider
                                            ${selected ? 'text-white/85' : 'text-ink-subtle'}`}
                            >
                                {DAY_LABELS[(d.getDay() + 6) % 7]}
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle font-semibold mb-2">
                Programma di oggi
            </p>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {todayEvents.length === 0 && (
                    <p className="text-[11px] text-ink-subtle italic py-1.5">
                        Nessun evento in programma.
                    </p>
                )}
                {todayEvents.map(e => (
                    <button
                        key={e.id}
                        type="button"
                        onClick={() => openNotice(
                            e.title,
                            `${fmtTime(e.startTime)}${e.endTime ? ` – ${fmtTime(e.endTime)}` : ''}`,
                        )}
                        className="pressable w-full text-left px-2 py-1.5 flex items-center gap-2 rounded-lg
                                   hover:bg-surface-inset/60 transition-colors"
                    >
                        <span className="text-[10px] font-semibold text-ink-subtle tabular-nums w-10 flex-shrink-0">
                            {fmtTime(e.startTime)}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-lg
                                        bg-surface-inset/60 border border-line/30">
                            <span className="w-1 h-5 rounded-full flex-shrink-0 bg-brand-600" />
                            <p className="text-[11px] font-medium text-ink truncate">{e.title}</p>
                            <Clock className="w-3 h-3 text-ink-subtle flex-shrink-0 ml-auto" />
                        </div>
                    </button>
                ))}
            </div>
        </Card>
    );
}

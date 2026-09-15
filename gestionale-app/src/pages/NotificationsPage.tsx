import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../features/notifications/NotificationProvider';

function typeLabel(type: string) {
    if (type === 'chat.mentioned') return 'Citazione in chat';
    if (type === 'chat.message') return 'Messaggio';
    if (type === 'task.assigned') return 'Lavoro assegnato';
    if (type === 'task.updated') return 'Lavoro aggiornato';
    if (type === 'event.invited') return 'Call / evento';
    return 'Avviso';
}

function timeLabel(iso: string) {
    try {
        return new Date(iso).toLocaleString('it-IT', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export function NotificationsPage() {
    const navigate = useNavigate();
    const { items, unread, markRead, markAllRead, refresh } = useNotifications();

    return (
        <section className="bento-panel overflow-hidden min-h-[min(70vh,36rem)] flex flex-col">
            <div className="px-4 pt-4 pb-3 border-b border-line/40 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-ink tracking-tight">Notifiche</h2>
                    <p className="text-xs text-ink-subtle mt-0.5">
                        Chat, lavori e call in cui sei coinvolto
                        {unread ? ` · ${unread} da leggere` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" className="text-xs text-ink-subtle hover:text-ink" onClick={() => refresh()}>
                        Aggiorna
                    </button>
                    {unread > 0 && (
                        <button
                            type="button"
                            className="text-xs text-brand-400 hover:text-brand-300"
                            onClick={() => markAllRead()}
                        >
                            Segna tutte come lette
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {items.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="w-6 h-6 text-ink-subtle mx-auto mb-2" />
                        <p className="text-sm text-ink-muted">Nessuna notifica per ora.</p>
                    </div>
                ) : (
                    <ul>
                        {items.map((row) => {
                            const unreadRow = !row.readAt;
                            const href = row.payload?.url || '/notifiche';
                            return (
                                <li key={row.id} className="border-b border-line/30">
                                    <a
                                        href={href}
                                        className={`block px-4 py-3 hover:bg-surface-inset/50 ${unreadRow ? 'bg-brand-500/5' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (unreadRow) void markRead(row.id);
                                            if (href && href !== '/notifiche') navigate(href);
                                        }}
                                    >
                                        <p className="text-[10px] uppercase tracking-wide text-ink-subtle">
                                            {typeLabel(row.type)} · {timeLabel(row.createdAt)}
                                        </p>
                                        <p className="text-sm font-medium text-ink mt-0.5">{row.title}</p>
                                        {row.body ? (
                                            <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{row.body}</p>
                                        ) : null}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}

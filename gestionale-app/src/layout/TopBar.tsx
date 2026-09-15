import { Search, Bell, NotebookPen, MessageSquare, ChevronDown, LogOut } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { DropdownPanel } from '../components/motion/DropdownPanel';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../app/AuthProvider';
import { useNotifications } from '../features/notifications/NotificationProvider';
import { canAccessView } from '../lib/permissions';
import type { User } from '../types/models';

interface TopBarProps {
    user: User | null;
    onLogout: () => void;
    title?: string;
    onNavigate?: (view: string) => void;
    onQuickAction?: (title: string, message?: string) => void;
}

const SEARCH_TARGETS = [
    { label: 'Dashboard', hint: 'Panoramica e Kanban', view: 'dashboard' },
    { label: 'Clienti', hint: 'Anagrafica e stato commerciale', view: 'clienti' },
    { label: 'Progetti', hint: 'Progetti e todo list', view: 'progetti' },
    { label: 'Contabilità', hint: 'Contratti, fatture e preventivi', view: 'contabilita' },
    { label: 'Calendario', hint: 'Eventi e chiamate', view: 'calendario' },
    { label: 'Inbox', hint: 'Messaggi e richieste', view: 'inbox' },
    { label: 'Report', hint: 'Metriche e riepiloghi', view: 'reports' },
    { label: 'Notifiche', hint: 'Aggiornamenti recenti', view: 'notifiche' },
];

export function TopBar({ user, onLogout, onNavigate, onQuickAction }: TopBarProps) {
    const { user: authUser } = useAuth();
    const { unread } = useNotifications();
    const [menuOpen, setMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const allowedTargets = useMemo(
        () => SEARCH_TARGETS.filter((t) => canAccessView(authUser, t.view)),
        [authUser],
    );

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allowedTargets.slice(0, 5);
        return allowedTargets.filter((t) =>
            `${t.label} ${t.hint}`.toLowerCase().includes(q),
        );
    }, [query, allowedTargets]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const goTo = (view: string) => {
        onNavigate?.(view);
        setQuery('');
        setSearchOpen(false);
    };

    return (
        <header className="h-16 border-b border-line/40 bg-surface-raised/40 glass
                           grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,28rem)_1fr] items-center
                           px-4 md:px-6 gap-3 flex-shrink-0 relative z-30">
            <div className="hidden lg:block" aria-hidden />

            <div className="relative w-full max-w-md mx-auto lg:max-w-none lg:mx-0" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && results[0]) goTo(results[0].view);
                        if (e.key === 'Escape') setSearchOpen(false);
                    }}
                    placeholder="Vai a una sezione…"
                    className="search-pill pr-12"
                    aria-expanded={searchOpen}
                    aria-controls="topbar-search-menu"
                />
                <kbd
                    aria-hidden
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-[10px] font-medium text-ink-subtle
                               px-1.5 py-0.5 rounded-md border border-line/60
                               bg-surface-inset/70 pointer-events-none"
                >
                    /
                </kbd>
                <DropdownPanel
                    open={searchOpen}
                    triggerRef={searchRef}
                    origin="top"
                    align="stretch"
                    role="listbox"
                    id="topbar-search-menu"
                    className="bento-panel p-2 overflow-y-auto"
                >
                    {results.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-ink-subtle">
                            Nessun risultato.
                        </div>
                    ) : results.map(result => (
                        <button
                            key={result.view}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goTo(result.view)}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-inset/80 transition-colors"
                        >
                            <span className="block text-sm font-medium text-ink">{result.label}</span>
                            <span className="block text-xs text-ink-subtle">{result.hint}</span>
                        </button>
                    ))}
                </DropdownPanel>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 justify-center lg:justify-end flex-shrink-0">
                <button
                    className="icon-btn"
                    aria-label="Note"
                    onClick={() => onQuickAction?.('Note rapide', 'Qui potrai raccogliere appunti collegati a clienti, progetti e task.')}
                >
                    <NotebookPen className="w-4 h-4" />
                </button>
                <button
                    className="icon-btn relative"
                    aria-label={unread ? `Notifiche, ${unread} non lette` : 'Notifiche'}
                    onClick={() => onNavigate?.('notifiche')}
                >
                    <Bell className="w-4 h-4" />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[1.05rem] h-[1.05rem] px-1
                                         rounded-full bg-brand-500 text-[9px] font-semibold text-white
                                         flex items-center justify-center ring-2 ring-surface-raised">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>
                {canAccessView(authUser, 'inbox') && (
                    <button
                        className="icon-btn"
                        aria-label="Chat"
                        onClick={() => onNavigate?.('inbox')}
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                )}

                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setMenuOpen(o => !o)}
                        className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-surface-inset/60 transition-colors"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                    >
                        <Avatar
                            name={user?.name || '?'}
                            src={user?.avatarUrl}
                            color={user?.color}
                            size="sm"
                        />
                        <div className="hidden sm:block text-left leading-tight">
                            <div className="text-sm font-medium text-ink">{user?.name || '—'}</div>
                            <div className="text-[10px] text-ink-subtle">
                                {user?.handle || `@${(user?.email || '').split('@')[0]}`}
                            </div>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-ink-subtle hidden sm:block" />
                    </button>

                    <DropdownPanel
                        open={menuOpen}
                        triggerRef={ref}
                        origin="top-right"
                        align="end"
                        className="w-56 bento-panel p-2"
                    >
                            <div className="px-3 py-2">
                                <div className="text-sm font-medium text-ink">{user?.name}</div>
                                <div className="text-xs text-ink-subtle">{user?.email}</div>
                            </div>
                            <div className="border-t border-line/40 my-1" />
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10"
                            >
                                <LogOut className="w-4 h-4" />
                                Esci
                            </button>
                    </DropdownPanel>
                </div>
            </div>
        </header>
    );
}

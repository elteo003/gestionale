import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthProvider';
import { getWsUrl } from '../../lib/api/client';
import { notificationsAPI } from '../../services/api';
import { showNotice } from '../../utils/notice';
import type { AppNotification } from '../../types/models';
import { ensurePushSubscription } from './ensurePushSubscription';

interface PushFrame {
    notificationId?: string;
    type?: string;
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    data?: { url?: string };
}

interface NotificationContextValue {
    unread: number;
    items: AppNotification[];
    refresh: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const seenIds = new Set<string>();

function frameToNotice(frame: PushFrame): { id: string; title: string; body: string; url: string } {
    const id = frame.notificationId || `${frame.tag || 'n'}-${frame.title || ''}`;
    return {
        id,
        title: frame.title || 'Notifica',
        body: frame.body || '',
        url: frame.url || frame.data?.url || '/notifiche',
    };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState<AppNotification[]>([]);
    const userId = user?.id;

    const refresh = useCallback(async () => {
        if (!isAuthenticated) {
            setUnread(0);
            setItems([]);
            return;
        }
        try {
            const [countRes, list] = await Promise.all([
                notificationsAPI.unreadCount(),
                notificationsAPI.list({ limit: 40 }),
            ]);
            setUnread(countRes?.count ?? 0);
            const rows = Array.isArray(list) ? list : [];
            for (const row of rows) {
                if (row.id) seenIds.add(row.id);
            }
            setItems(rows);
        } catch {
            /* lista non critica per la sessione */
        }
    }, [isAuthenticated]);

    const ingestFrame = useCallback((raw: PushFrame) => {
        const notice = frameToNotice(raw);
        if (seenIds.has(notice.id)) return;
        seenIds.add(notice.id);
        if (seenIds.size > 200) {
            const first = seenIds.values().next().value;
            if (first) seenIds.delete(first);
        }
        setUnread((n) => n + 1);
        setItems((prev) => {
            if (prev.some((row) => row.id === notice.id)) return prev;
            const incoming: AppNotification = {
                id: notice.id,
                type: raw.type || 'chat.message',
                title: notice.title,
                body: notice.body,
                payload: { url: notice.url, tag: raw.tag },
                createdAt: new Date().toISOString(),
                readAt: null,
            };
            return [incoming, ...prev].slice(0, 40);
        });
        if (document.visibilityState === 'visible') {
            showNotice('info', notice.title, notice.body);
        }
    }, []);

    const markRead = useCallback(async (id: string) => {
        try {
            await notificationsAPI.markRead(id);
        } catch {
            /* resta locale */
        }
        setItems((prev) => {
            const wasUnread = prev.some((row) => row.id === id && !row.readAt);
            if (wasUnread) setUnread((n) => Math.max(0, n - 1));
            return prev.map((row) => (
                row.id === id ? { ...row, readAt: row.readAt || new Date().toISOString() } : row
            ));
        });
    }, []);

    const markAllRead = useCallback(async () => {
        try {
            await notificationsAPI.markAllRead();
        } catch {
            /* resta locale */
        }
        setItems((prev) => prev.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() })));
        setUnread(0);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!isAuthenticated) return;
        ensurePushSubscription().catch(() => undefined);
    }, [isAuthenticated, userId]);

    useEffect(() => {
        if (!isAuthenticated) return;
        let stopped = false;
        let backoff = 1000;
        let retryTimer = 0;
        let ws: WebSocket | null = null;

        const connect = () => {
            if (stopped) return;
            ws = new WebSocket(getWsUrl());
            ws.onopen = () => {
                backoff = 1000;
                const token = localStorage.getItem('token');
                if (token) ws?.send(JSON.stringify({ type: 'auth', token }));
            };
            ws.onmessage = (event) => {
                let data: { type?: string; payload?: PushFrame };
                try {
                    data = JSON.parse(String(event.data));
                } catch {
                    return;
                }
                if (data.type === 'notification' && data.payload) {
                    ingestFrame(data.payload);
                }
            };
            ws.onclose = () => {
                if (stopped) return;
                retryTimer = window.setTimeout(connect, backoff);
                backoff = Math.min(backoff * 2, 15_000);
            };
        };

        connect();
        return () => {
            stopped = true;
            window.clearTimeout(retryTimer);
            ws?.close();
        };
    }, [isAuthenticated, ingestFrame]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return undefined;
        const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            if (data.type === 'push' && data.payload) ingestFrame(data.payload);
            if (data.type === 'navigate' && typeof data.url === 'string') {
                navigate(data.url);
            }
        };
        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [ingestFrame, navigate]);

    useEffect(() => {
        const off = window.jeins?.onNavigate?.((url) => {
            if (url) navigate(url);
        });
        return () => { off?.(); };
    }, [navigate]);

    const value = useMemo(
        () => ({ unread, items, refresh, markRead, markAllRead }),
        [unread, items, refresh, markRead, markAllRead],
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        return {
            unread: 0,
            items: [] as AppNotification[],
            refresh: async () => undefined,
            markRead: async () => undefined,
            markAllRead: async () => undefined,
        };
    }
    return ctx;
}

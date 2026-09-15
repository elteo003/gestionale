import { useEffect, useRef } from 'react';
import { getWsUrl } from '../../lib/api/client';
import type { Message } from '../../types/models';

interface UseChatSocketOptions {
    chatId: string | null;
    onMessage: (message: Message) => void;
    onReady?: () => void;
}

export function useChatSocket({ chatId, onMessage, onReady }: UseChatSocketOptions) {
    const onMessageRef = useRef(onMessage);
    const onReadyRef = useRef(onReady);
    const chatIdRef = useRef(chatId);
    const wsRef = useRef<WebSocket | null>(null);

    onMessageRef.current = onMessage;
    onReadyRef.current = onReady;
    chatIdRef.current = chatId;

    useEffect(() => {
        let stopped = false;
        let backoff = 1000;
        let retryTimer = 0;

        const subscribe = (ws: WebSocket) => {
            const id = chatIdRef.current;
            if (!id || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: 'subscribe', chatId: id }));
        };

        const connect = () => {
            if (stopped) return;
            const ws = new WebSocket(getWsUrl());
            wsRef.current = ws;

            ws.onopen = () => {
                backoff = 1000;
                const token = localStorage.getItem('token');
                if (token) ws.send(JSON.stringify({ type: 'auth', token }));
            };

            ws.onmessage = (event) => {
                let data: { type?: string; payload?: Message };
                try {
                    data = JSON.parse(String(event.data));
                } catch {
                    return;
                }
                if (data.type === 'ready' || data.type === 'subscribed') {
                    if (data.type === 'ready') subscribe(ws);
                    if (data.type === 'ready') onReadyRef.current?.();
                    return;
                }
                if (data.type === 'message' && data.payload?.id) {
                    onMessageRef.current(data.payload);
                }
            };

            ws.onclose = () => {
                if (wsRef.current === ws) wsRef.current = null;
                if (stopped) return;
                retryTimer = window.setTimeout(connect, backoff);
                backoff = Math.min(backoff * 2, 15_000);
            };
        };

        connect();

        return () => {
            stopped = true;
            window.clearTimeout(retryTimer);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, []);

    useEffect(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (chatId) {
            ws.send(JSON.stringify({ type: 'subscribe', chatId }));
        } else {
            ws.send(JSON.stringify({ type: 'unsubscribe' }));
        }
    }, [chatId]);
}

import { WebSocketServer, WebSocket } from 'ws';
import { isSocio } from './roles.js';
import { isChatMember, isUuid } from './chatAccess.js';
import { tokenFromCookieHeader, userFromAccessToken } from '../middleware/auth.js';

const DEFAULT_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'https://gestionale-i5bj.onrender.com',
];

function allowedOrigins() {
    return (process.env.FRONTEND_URL || DEFAULT_ORIGINS.join(','))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function originAllowed(origin) {
    if (!origin) return true;
    if (allowedOrigins().includes(origin)) return true;
    return process.env.NODE_ENV !== 'production';
}

export async function userFromUpgradeRequest(req) {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || tokenFromCookieHeader(req.headers.cookie);
    if (!token) return null;
    try {
        return await userFromAccessToken(token);
    } catch {
        return null;
    }
}

export function createChatHub() {
    const sockets = new Set();

    function publish(chatId, payloadOrMap) {
        for (const client of sockets) {
            if (client.chatId !== chatId) continue;
            if (client.ws.readyState !== WebSocket.OPEN) continue;
            const payload = typeof payloadOrMap === 'function'
                ? payloadOrMap(client)
                : payloadOrMap;
            client.ws.send(JSON.stringify({ type: 'message', payload }));
        }
    }

    function publishToUser(userId, payload) {
        const frame = JSON.stringify({ type: 'notification', payload });
        for (const client of sockets) {
            if (client.userId !== userId) continue;
            if (client.ws.readyState !== WebSocket.OPEN) continue;
            client.ws.send(frame);
        }
    }

    return { sockets, publish, publishToUser };
}

const defaultHub = createChatHub();

export function publishChatMessage(chatId, payload) {
    defaultHub.publish(chatId, payload);
}

export function publishToUser(userId, payload) {
    defaultHub.publishToUser(userId, payload);
}

function sendJson(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

async function handleClientMessage(client, raw) {
    let data;
    try {
        data = JSON.parse(String(raw));
    } catch {
        return;
    }
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'auth') {
        if (client.authed) return;
        try {
            const user = await userFromAccessToken(data.token);
            if (!user || isSocio(user.role)) {
                client.ws.close(4403, 'Forbidden');
                return;
            }
            client.userId = user.userId;
            client.role = user.role;
            client.area = user.area;
            client.authed = true;
            sendJson(client.ws, { type: 'ready' });
        } catch {
            client.ws.close(4401, 'Unauthorized');
        }
        return;
    }

    if (!client.authed || !client.userId) return;

    if (data.type === 'subscribe') {
        const chatId = data.chatId;
        if (!isUuid(chatId) || !(await isChatMember(client.userId, chatId))) {
            sendJson(client.ws, { type: 'error', error: 'Chat non disponibile' });
            return;
        }
        client.chatId = chatId;
        sendJson(client.ws, { type: 'subscribed', chatId });
        return;
    }

    if (data.type === 'unsubscribe') {
        client.chatId = null;
    }
}

export function attachChatHub(httpServer, hub = defaultHub) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', async (ws, req) => {
        if (!originAllowed(req.headers.origin)) {
            ws.close(4403, 'Origin non consentita');
            return;
        }

        const client = { ws, userId: null, chatId: null, authed: false, isAlive: true };
        hub.sockets.add(client);

        const existing = await userFromUpgradeRequest(req);
        if (existing) {
            if (isSocio(existing.role)) {
                hub.sockets.delete(client);
                ws.close(4403, 'Forbidden');
                return;
            }
            client.userId = existing.userId;
            client.role = existing.role;
            client.area = existing.area;
            client.authed = true;
            sendJson(ws, { type: 'ready' });
        }

        const authTimeout = setTimeout(() => {
            if (!client.authed) {
                hub.sockets.delete(client);
                ws.close(4401, 'Unauthorized');
            }
        }, 4000);

        ws.on('pong', () => {
            client.isAlive = true;
        });

        ws.on('message', (raw) => {
            handleClientMessage(client, raw).catch((err) => {
                console.error('Errore WS chat:', err);
            });
        });

        ws.on('close', () => {
            clearTimeout(authTimeout);
            hub.sockets.delete(client);
        });
    });

    const heartbeat = setInterval(() => {
        for (const client of hub.sockets) {
            if (client.isAlive === false) {
                hub.sockets.delete(client);
                client.ws.terminate();
                continue;
            }
            client.isAlive = false;
            if (client.ws.readyState === WebSocket.OPEN) client.ws.ping();
        }
    }, 30_000);

    wss.on('close', () => clearInterval(heartbeat));
    httpServer.on('close', () => {
        clearInterval(heartbeat);
        wss.close();
    });

    return wss;
}

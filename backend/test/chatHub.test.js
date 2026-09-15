import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { tokenFromCookieHeader } from '../middleware/auth.js';
import { createChatHub, originAllowed } from '../lib/chatHub.js';
import { isUuid } from '../lib/chatAccess.js';

describe('chat hub', () => {
    it('tokenFromCookieHeader legge access_token', () => {
        const token = tokenFromCookieHeader('foo=bar; access_token=abc%20123; other=z');
        assert.equal(token, 'abc 123');
    });

    it('publish con mapper redige il payload per client', () => {
        const hub = createChatHub();
        const sentA = [];
        const sentB = [];
        hub.sockets.add({
            ws: { readyState: WebSocket.OPEN, send: (s) => sentA.push(s) },
            chatId: 'chat-1',
            userId: 'user-a',
        });
        hub.sockets.add({
            ws: { readyState: WebSocket.OPEN, send: (s) => sentB.push(s) },
            chatId: 'chat-1',
            userId: 'user-b',
        });
        hub.publish('chat-1', (client) => ({
            body: 'ciao',
            for: client.userId,
        }));
        assert.equal(JSON.parse(sentA[0]).payload.for, 'user-a');
        assert.equal(JSON.parse(sentB[0]).payload.for, 'user-b');
    });

    it('publish raggiunge solo i socket della chat iscritta', () => {
        const hub = createChatHub();
        const sentA = [];
        const sentB = [];
        hub.sockets.add({
            ws: { readyState: WebSocket.OPEN, send: (s) => sentA.push(s) },
            chatId: 'chat-1',
        });
        hub.sockets.add({
            ws: { readyState: WebSocket.OPEN, send: (s) => sentB.push(s) },
            chatId: 'chat-2',
        });
        hub.publish('chat-1', { id: 'm1', body: 'ciao' });
        assert.equal(sentA.length, 1);
        assert.equal(sentB.length, 0);
        const frame = JSON.parse(sentA[0]);
        assert.equal(frame.type, 'message');
        assert.equal(frame.payload.body, 'ciao');
    });

    it('originAllowed accetta localhost in dev', () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        assert.equal(originAllowed('http://localhost:5173'), true);
        process.env.NODE_ENV = prev;
    });

    it('isUuid valida solo uuid', () => {
        assert.equal(isUuid('3fa85f64-5717-4562-b3fc-2c963f66afa6'), true);
        assert.equal(isUuid('not-a-uuid'), false);
    });
});

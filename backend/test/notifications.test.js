import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createChatHub } from '../lib/chatHub.js';
import { subscribeSchema } from '../validators/notificationSchemas.js';
import {
    TYPES,
    buildPushPayload,
    clipBody,
    notifyUsers,
    settingEnabled,
    uniqueRecipients,
} from '../services/notificationService.js';
import { isPushGoneStatus } from '../services/webPush.js';

describe('notification recipients e preferenze', () => {
    it('esclude l\'attore e i duplicati', () => {
        assert.deepEqual(
            uniqueRecipients(['a', 'b', 'a', 'c', ''], 'b'),
            ['a', 'c'],
        );
    });

    it('tipo assente nelle preferenze resta acceso', () => {
        assert.equal(settingEnabled({}, TYPES.CHAT_MESSAGE), true);
        assert.equal(settingEnabled({ 'chat.message': false }, TYPES.CHAT_MESSAGE), false);
        assert.equal(settingEnabled({ 'task.assigned': true }, TYPES.CHAT_MESSAGE), true);
    });

    it('clipBody tronca con ellissi', () => {
        assert.equal(clipBody('ciao'), 'ciao');
        assert.equal(clipBody('x'.repeat(200)).length, 180);
        assert.ok(clipBody('x'.repeat(200)).endsWith('…'));
    });

    it('payload push porta url e tag per web e desktop', () => {
        const frame = buildPushPayload({
            id: 'n1',
            type: TYPES.CHAT_MESSAGE,
            title: 'Anna',
            body: 'ciao',
            collapseKey: 'chat:c1',
            payload: { url: '/inbox?chat=c1', chatId: 'c1', tag: 'chat:c1' },
        });
        assert.equal(frame.url, '/inbox?chat=c1');
        assert.equal(frame.tag, 'chat:c1');
        assert.equal(frame.notificationId, 'n1');
        assert.equal(frame.data.chatId, 'c1');
    });

    it('410 e 404 sono subscription morte', () => {
        assert.equal(isPushGoneStatus(410), true);
        assert.equal(isPushGoneStatus(404), true);
        assert.equal(isPushGoneStatus(500), false);
    });
});

describe('notifyUsers', () => {
    it('non inserisce né pusha l\'attore, e rispetta preferenze off', async () => {
        const actor = '11111111-1111-4111-8111-111111111111';
        const allowed = '22222222-2222-4222-8222-222222222222';
        const muted = '33333333-3333-4333-8333-333333333333';
        const published = [];
        const pushed = [];
        const inserted = [];

        async function query(sql, params) {
            if (sql.includes('FROM notification_preferences')) {
                return {
                    rows: [{ userId: muted, settings: { 'chat.message': false } }],
                };
            }
            if (sql.includes('INSERT INTO notifications')) {
                inserted.push(params);
                return {
                    rows: [{
                        id: 'nid-1',
                        userId: allowed,
                        type: TYPES.CHAT_MESSAGE,
                        title: 'Ciao',
                        body: 'testo',
                        payload: { url: '/inbox?chat=c1' },
                        actorId: actor,
                        collapseKey: 'chat:c1',
                    }],
                };
            }
            throw new Error(`query inattesa: ${sql.slice(0, 80)}`);
        }

        const rows = await notifyUsers({
            type: TYPES.CHAT_MESSAGE,
            actorId: actor,
            recipientIds: [actor, allowed, muted, allowed],
            title: 'Ciao',
            body: 'testo',
            collapseKey: 'chat:c1',
            payload: { url: '/inbox?chat=c1' },
        }, {
            query,
            publishToUser: (userId, payload) => published.push({ userId, payload }),
            sendWebPushToUsers: async (ids, payload) => { pushed.push({ ids, payload }); },
        });

        assert.equal(rows.length, 1);
        assert.equal(rows[0].userId, allowed);
        assert.equal(published.length, 1);
        assert.equal(published[0].userId, allowed);
        assert.equal(published[0].payload.type, TYPES.CHAT_MESSAGE);
        assert.equal(pushed[0].ids[0], allowed);
        assert.equal(inserted[0][0], allowed);
        assert.equal(inserted.length, 1);
    });
});

describe('subscribe schema', () => {
    it('accetta web e desktop, rifiuta piattaforme ignote', () => {
        const base = {
            endpoint: 'https://fcm.googleapis.com/push/abc',
            keys: { p256dh: 'a'.repeat(24), auth: 'b'.repeat(12) },
        };
        assert.equal(subscribeSchema.safeParse({ ...base, platform: 'web' }).success, true);
        assert.equal(subscribeSchema.safeParse({ ...base, platform: 'desktop' }).success, true);
        assert.equal(subscribeSchema.safeParse({ ...base, platform: 'ios' }).success, false);
        assert.equal(subscribeSchema.safeParse({ ...base, platform: 'web', endpoint: 'not-a-url' }).success, false);
    });
});

describe('chat hub user notifications', () => {
    it('publishToUser raggiunge solo i socket di quell\'utente', () => {
        const hub = createChatHub();
        const sentA = [];
        const sentB = [];
        hub.sockets.add({
            ws: { readyState: WebSocket.OPEN, send: (s) => sentA.push(s) },
            userId: 'user-a',
            chatId: 'chat-1',
        });
        hub.sockets.add({
            ws: { readyState: WebSocket.OPEN, send: (s) => sentB.push(s) },
            userId: 'user-b',
            chatId: 'chat-1',
        });
        hub.publishToUser('user-a', { notificationId: 'n1', title: 'ping' });
        assert.equal(sentA.length, 1);
        assert.equal(sentB.length, 0);
        const frame = JSON.parse(sentA[0]);
        assert.equal(frame.type, 'notification');
        assert.equal(frame.payload.notificationId, 'n1');
    });
});

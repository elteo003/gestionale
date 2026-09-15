import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    canSeeProjectArea,
    redactCitation,
    shapeMessage,
    shapeReply,
} from '../lib/documentAccess.js';

const privileged = { role: 'CDA', area: 'IT', userId: 'u1' };
const marketing = { role: 'Socio', area: 'Marketing', userId: 'u2' };
const sameArea = { role: 'Commerciale', area: 'IT', userId: 'u3' };

describe('documentAccess', () => {
    it('privilegiato vede qualsiasi area', () => {
        assert.equal(canSeeProjectArea(privileged, 'Marketing'), true);
        assert.equal(canSeeProjectArea(sameArea, 'IT'), true);
        assert.equal(canSeeProjectArea(sameArea, 'Marketing'), false);
        assert.equal(canSeeProjectArea(marketing, 'IT'), false);
    });

    it('redactCitation nasconde url e titolo senza permesso', () => {
        const row = {
            resourceId: 'r1',
            resourceTitle: 'Brief cliente',
            resourceUrl: 'https://drive.example/brief',
            resourceProject: 'Cimplasta',
            resourceArea: 'IT',
        };
        const open = redactCitation(privileged, row);
        assert.equal(open.allowed, true);
        assert.equal(open.url, 'https://drive.example/brief');
        const hidden = redactCitation(marketing, row);
        assert.equal(hidden.allowed, false);
        assert.equal(hidden.url, null);
        assert.equal(hidden.title, null);
    });

    it('shapeMessage include quote e citazione', () => {
        const msg = shapeMessage({
            id: 'm1',
            chatId: 'c1',
            senderId: 'u1',
            senderName: 'Anna',
            senderAvatar: null,
            senderHandle: null,
            senderColor: null,
            body: 'ecco il file',
            createdAt: '2026-09-15T10:00:00Z',
            replyId: 'm0',
            replyBody: 'Dove trovo il brief?',
            replyAuthor: 'laura',
            resourceId: 'r1',
            resourceTitle: 'Brief cliente',
            resourceUrl: 'https://x.test/b',
            resourceProject: 'Board',
            resourceArea: 'IT',
        }, privileged);
        assert.equal(msg.reply.author, 'laura');
        assert.equal(msg.citation.title, 'Brief cliente');
        assert.deepEqual(msg.mentions, []);
        assert.equal(shapeReply({}), null);
    });
});

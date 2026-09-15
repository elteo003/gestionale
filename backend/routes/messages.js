import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireNotSocio } from '../middleware/authorize.js';
import { isChatMember, isUuid } from '../lib/chatAccess.js';
import { publishChatMessage } from '../lib/chatHub.js';
import { clipBody, notifyChatMessage, scheduleNotify } from '../services/notificationService.js';
import {
    isPrivileged,
} from '../lib/roles.js';
import {
    shapeMessage,
    userCanSeeProject,
} from '../lib/documentAccess.js';

const router = express.Router();
router.use(authenticateToken);
router.use(requireNotSocio);

const MESSAGE_FROM = `
    messages m
    LEFT JOIN users u ON u.user_id = m.sender_id
    LEFT JOIN message_citations mc ON mc.message_id = m.message_id
    LEFT JOIN messages rm ON rm.message_id = mc.reply_to_id
    LEFT JOIN users ru ON ru.user_id = rm.sender_id
    LEFT JOIN project_resources r ON r.resource_id = mc.cited_resource_id
    LEFT JOIN projects rp ON rp.project_id = r.project_id
`;

const MESSAGE_SELECT = `
    m.message_id as id, m.chat_id as "chatId", m.sender_id as "senderId",
    m.body, m.created_at as "createdAt",
    u.name as "senderName", u.avatar_url as "senderAvatar",
    u.handle as "senderHandle", u.color as "senderColor",
    rm.message_id as "replyId", rm.body as "replyBody", ru.name as "replyAuthor",
    r.resource_id as "resourceId", r.title as "resourceTitle", r.url as "resourceUrl",
    rp.name as "resourceProject", rp.area as "resourceArea", rp.project_id as "resourceProjectId",
    COALESCE((
        SELECT json_agg(json_build_object(
            'id', mu.user_id,
            'name', mu.name,
            'handle', mu.handle,
            'color', mu.color,
            'avatarUrl', mu.avatar_url
        ) ORDER BY mu.name)
        FROM message_mentions mm
        JOIN users mu ON mu.user_id = mm.user_id
        WHERE mm.message_id = m.message_id
    ), '[]'::json) as mentions
`;

async function requireMember(req, res, chatId) {
    if (!isUuid(chatId)) {
        res.status(400).json({ error: 'Chat non valida' });
        return false;
    }
    if (!(await isChatMember(req.user.userId, chatId))) {
        res.status(403).json({ error: 'Non sei membro di questa chat' });
        return false;
    }
    return true;
}

function parseLimit(query, fallback = 50) {
    const n = parseInt(String(query.limit ?? fallback), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(100, Math.max(1, n));
}

function mapMessages(rows, user) {
    return rows.map((row) => shapeMessage(row, user));
}

async function loadCitedResource(resourceId, user) {
    if (!resourceId) return null;
    if (!isUuid(resourceId)) return { error: 'Documento non valido', status: 400 };
    const result = await pool.query(
        `SELECT r.resource_id as id, r.title, r.url, r.project_id as "projectId",
                p.name as "projectName", p.area
         FROM project_resources r
         JOIN projects p ON p.project_id = r.project_id
         WHERE r.resource_id = $1`,
        [resourceId],
    );
    const row = result.rows[0];
    if (!row) return { error: 'Documento non trovato', status: 404 };
    if (!(await userCanSeeProject(user, row.projectId, row.area))) {
        return { error: 'Non puoi citare questo documento', status: 403 };
    }
    return { resource: row };
}

async function logChatActivity({
    actorId, chatId, body, reply, citation, projectIdHint,
}) {
    const chat = await pool.query(
        'SELECT name, project_id as "projectId" FROM chats WHERE chat_id = $1',
        [chatId],
    );
    const projectId = citation?.projectId || chat.rows[0]?.projectId || projectIdHint || null;
    if (!projectId) return;
    const payload = {
        body: body ? clipBody(body, 220) : '',
        target: chat.rows[0]?.name || citation?.projectName || 'Chat',
    };
    if (reply?.text) {
        payload.reply = { author: reply.author, text: clipBody(reply.text, 160) };
    }
    if (citation?.title) {
        payload.fileName = citation.title;
        payload.url = citation.url || undefined;
    }
    await pool.query(
        `INSERT INTO activities (actor_id, type, target_type, target_id, project_id, payload)
         VALUES ($1, 'comment.added', 'chat', $2, $3, $4::jsonb)`,
        [actorId, chatId, projectId, JSON.stringify(payload)],
    );
}

// GET /api/chats - elenco chat dell'utente con ultimo messaggio
router.get('/chats', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.chat_id as id, c.project_id as "projectId", c.name, c.is_group as "isGroup",
                    c.updated_at as "updatedAt",
                    (SELECT json_build_object(
                        'id', m.message_id,
                        'body', m.body,
                        'senderId', m.sender_id,
                        'senderName', u.name,
                        'createdAt', m.created_at
                     )
                     FROM messages m
                     LEFT JOIN users u ON u.user_id = m.sender_id
                     WHERE m.chat_id = c.chat_id
                     ORDER BY m.created_at DESC LIMIT 1) as "lastMessage"
             FROM chats c
             JOIN chat_members cm ON cm.chat_id = c.chat_id
             WHERE cm.user_id = $1
             ORDER BY c.updated_at DESC`,
            [req.user.userId],
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore get chats:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/chats/:id/documents?q=
router.get('/chats/:id/documents', async (req, res) => {
    try {
        const chatId = req.params.id;
        if (!(await requireMember(req, res, chatId))) return;

        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const chat = await pool.query(
            'SELECT project_id as "projectId" FROM chats WHERE chat_id = $1',
            [chatId],
        );
        const chatProjectId = chat.rows[0]?.projectId || null;

        const params = [];
        const where = [];

        if (!isPrivileged(req.user.role)) {
            params.push(req.user.area || '');
            params.push(req.user.userId);
            where.push(`(
                p.area IS NULL OR p.area = $${params.length - 1}
                OR EXISTS (
                    SELECT 1 FROM project_assignments pa
                    WHERE pa.project_id = p.project_id AND pa.user_id = $${params.length}
                )
            )`);
        }
        if (q) {
            params.push(`%${q}%`);
            where.push(`r.title ILIKE $${params.length}`);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        params.push(chatProjectId);
        const prefer = `$${params.length}`;
        params.push(40);

        const result = await pool.query(
            `SELECT r.resource_id as id, r.title, r.url,
                    r.project_id as "projectId", p.name as "projectName", p.area
             FROM project_resources r
             JOIN projects p ON p.project_id = r.project_id
             ${whereSql}
             ORDER BY CASE WHEN r.project_id IS NOT DISTINCT FROM ${prefer} THEN 0 ELSE 1 END,
                      r.created_at DESC
             LIMIT $${params.length}`,
            params,
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore get chat documents:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/chats/:id/members
router.get('/chats/:id/members', async (req, res) => {
    try {
        const chatId = req.params.id;
        if (!(await requireMember(req, res, chatId))) return;

        const result = await pool.query(
            `SELECT u.user_id as id, u.name, u.handle, u.color,
                    u.avatar_url as "avatarUrl", u.role, u.area
             FROM chat_members cm
             JOIN users u ON u.user_id = cm.user_id
             WHERE cm.chat_id = $1 AND COALESCE(u.is_active, TRUE) = TRUE
             ORDER BY u.name ASC`,
            [chatId],
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore get chat members:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/chats/:id/messages?after=&before=&limit=
router.get('/chats/:id/messages', async (req, res) => {
    try {
        const chatId = req.params.id;
        if (!(await requireMember(req, res, chatId))) return;

        const limit = parseLimit(req.query);
        const after = typeof req.query.after === 'string' ? req.query.after : '';
        const before = typeof req.query.before === 'string' ? req.query.before : '';

        if (after && !isUuid(after)) return res.status(400).json({ error: 'Cursore after non valido' });
        if (before && !isUuid(before)) return res.status(400).json({ error: 'Cursore before non valido' });

        let result;
        if (after) {
            result = await pool.query(
                `SELECT ${MESSAGE_SELECT}
                 FROM ${MESSAGE_FROM}
                 WHERE m.chat_id = $1
                   AND (m.created_at, m.message_id) > (
                        SELECT created_at, message_id FROM messages
                        WHERE message_id = $2 AND chat_id = $1
                   )
                 ORDER BY m.created_at ASC, m.message_id ASC
                 LIMIT $3`,
                [chatId, after, limit],
            );
        } else if (before) {
            const older = await pool.query(
                `SELECT ${MESSAGE_SELECT}
                 FROM ${MESSAGE_FROM}
                 WHERE m.chat_id = $1
                   AND (m.created_at, m.message_id) < (
                        SELECT created_at, message_id FROM messages
                        WHERE message_id = $2 AND chat_id = $1
                   )
                 ORDER BY m.created_at DESC, m.message_id DESC
                 LIMIT $3`,
                [chatId, before, limit],
            );
            result = { rows: older.rows.slice().reverse() };
        } else {
            const newest = await pool.query(
                `SELECT ${MESSAGE_SELECT}
                 FROM ${MESSAGE_FROM}
                 WHERE m.chat_id = $1
                 ORDER BY m.created_at DESC, m.message_id DESC
                 LIMIT $2`,
                [chatId, limit],
            );
            result = { rows: newest.rows.slice().reverse() };
        }

        res.json(mapMessages(result.rows, req.user));
    } catch (error) {
        console.error('Errore get messages:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/chats/:id/messages
router.post('/chats/:id/messages', async (req, res) => {
    try {
        const chatId = req.params.id;
        if (!(await requireMember(req, res, chatId))) return;

        const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
        const replyToId = typeof req.body?.replyToId === 'string' ? req.body.replyToId : null;
        const citedResourceId = typeof req.body?.citedResourceId === 'string'
            ? req.body.citedResourceId
            : null;
        const mentionIds = Array.isArray(req.body?.mentionIds)
            ? [...new Set(req.body.mentionIds.filter(isUuid))]
            : [];

        if (!body && !replyToId && !citedResourceId) {
            return res.status(400).json({ error: 'Scrivi un testo o aggiungi una citazione' });
        }
        if (replyToId && !isUuid(replyToId)) {
            return res.status(400).json({ error: 'Citazione messaggio non valida' });
        }

        let replyRow = null;
        if (replyToId) {
            const found = await pool.query(
                `SELECT m.message_id as "replyId", m.body as "replyBody", u.name as "replyAuthor"
                 FROM messages m
                 LEFT JOIN users u ON u.user_id = m.sender_id
                 WHERE m.message_id = $1 AND m.chat_id = $2`,
                [replyToId, chatId],
            );
            if (!found.rows[0]) {
                return res.status(400).json({ error: 'Puoi rispondere solo a un messaggio di questa chat' });
            }
            replyRow = found.rows[0];
        }

        let cited = null;
        if (citedResourceId) {
            const loaded = await loadCitedResource(citedResourceId, req.user);
            if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
            cited = loaded.resource;
        }

        const inserted = await pool.query(
            `INSERT INTO messages (chat_id, sender_id, body)
             VALUES ($1, $2, $3)
             RETURNING message_id`,
            [chatId, req.user.userId, body],
        );
        const messageId = inserted.rows[0].message_id;
        if (replyToId || citedResourceId) {
            await pool.query(
                `INSERT INTO message_citations (message_id, reply_to_id, cited_resource_id)
                 VALUES ($1, $2, $3)`,
                [messageId, replyToId, citedResourceId],
            );
        }
        if (mentionIds.length) {
            await pool.query(
                `INSERT INTO message_mentions (message_id, user_id)
                 SELECT $1, cm.user_id
                 FROM chat_members cm
                 WHERE cm.chat_id = $2 AND cm.user_id = ANY($3::uuid[])
                 ON CONFLICT DO NOTHING`,
                [messageId, chatId, mentionIds],
            );
        }

        const hydrated = await pool.query(
            `SELECT ${MESSAGE_SELECT} FROM ${MESSAGE_FROM} WHERE m.message_id = $1`,
            [messageId],
        );
        await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE chat_id = $1', [chatId]);

        const raw = hydrated.rows[0];
        const message = shapeMessage(raw, req.user);
        publishChatMessage(chatId, (client) => shapeMessage(raw, {
            userId: client.userId,
            role: client.role,
            area: client.area,
        }));
        scheduleNotify(notifyChatMessage({
            chatId,
            messageId: message.id,
            actorId: req.user.userId,
            actorName: message.senderName,
            body: message.body || message.citation?.title || 'Nuovo messaggio',
            mentionIds,
        }));
        scheduleNotify(logChatActivity({
            actorId: req.user.userId,
            chatId,
            body: message.body,
            reply: message.reply,
            citation: cited,
        }));
        res.status(201).json(message);
    } catch (error) {
        console.error('Errore send message:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/chats - crea nuova chat
router.post('/chats', async (req, res) => {
    try {
        const { name, projectId, memberIds = [] } = req.body;
        const result = await pool.query(
            `INSERT INTO chats (name, project_id, is_group)
             VALUES ($1,$2,$3)
             RETURNING chat_id as id, name, project_id as "projectId", is_group as "isGroup"`,
            [name || null, projectId || null, memberIds.length !== 1],
        );
        const chat = result.rows[0];

        const rawMembers = Array.isArray(memberIds) ? memberIds : [];
        const allMembers = Array.from(new Set([req.user.userId, ...rawMembers])).filter(isUuid);
        if (allMembers.length === 0) allMembers.push(req.user.userId);
        const values = allMembers.map((_, i) => `($1, $${i + 2})`).join(',');
        await pool.query(
            `INSERT INTO chat_members (chat_id, user_id) VALUES ${values}
             ON CONFLICT DO NOTHING`,
            [chat.id, ...allMembers],
        );

        res.status(201).json(chat);
    } catch (error) {
        console.error('Errore create chat:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;

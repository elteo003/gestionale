import pool from '../database/connection.js';
import { publishToUser } from '../lib/chatHub.js';
import { sendWebPushToUsers } from './webPush.js';

export const TYPES = {
    CHAT_MESSAGE: 'chat.message',
    CHAT_MENTIONED: 'chat.mentioned',
    TASK_ASSIGNED: 'task.assigned',
    TASK_UPDATED: 'task.updated',
    EVENT_INVITED: 'event.invited',
};

export const DEFAULT_SETTINGS = {
    [TYPES.CHAT_MESSAGE]: true,
    [TYPES.CHAT_MENTIONED]: true,
    [TYPES.TASK_ASSIGNED]: true,
    [TYPES.TASK_UPDATED]: true,
    [TYPES.EVENT_INVITED]: true,
};

export function uniqueRecipients(ids, actorId) {
    const seen = new Set();
    const out = [];
    for (const id of ids || []) {
        if (typeof id !== 'string' || !id || id === actorId) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

export function settingEnabled(settings, type) {
    if (settings && Object.prototype.hasOwnProperty.call(settings, type)) {
        return settings[type] !== false;
    }
    return DEFAULT_SETTINGS[type] !== false;
}

export function clipBody(text, max = 180) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
}

export function mergedSettings(stored) {
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
}

export function buildPushPayload(row) {
    const payload = row.payload || {};
    return {
        notificationId: row.id,
        type: row.type,
        title: row.title,
        body: row.body || '',
        url: payload.url || '/notifiche',
        tag: row.collapseKey || payload.tag || row.id,
        data: payload,
    };
}

export function scheduleNotify(promise) {
    Promise.resolve(promise).catch((err) => {
        console.error('Notifica:', err.message || err);
    });
}

async function loadActorName(actorId, provided, query) {
    if (provided) return provided;
    if (!actorId) return 'Qualcuno';
    const result = await query('SELECT name FROM users WHERE user_id = $1', [actorId]);
    return result.rows[0]?.name || 'Qualcuno';
}

async function loadSettingsMap(userIds, query) {
    if (!userIds.length) return new Map();
    const result = await query(
        'SELECT user_id as "userId", settings FROM notification_preferences WHERE user_id = ANY($1::uuid[])',
        [userIds],
    );
    const map = new Map();
    for (const row of result.rows) map.set(row.userId, row.settings || {});
    return map;
}

async function insertInbox(rows, query) {
    if (!rows.length) return [];
    const values = [];
    const params = [];
    let i = 1;
    for (const row of rows) {
        values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}::jsonb, $${i++}, $${i++}, $${i++})`);
        params.push(
            row.userId,
            row.type,
            row.title,
            row.body,
            JSON.stringify(row.payload || {}),
            row.actorId || null,
            row.collapseKey || null,
            row.dedupeKey || null,
        );
    }
    const result = await query(
        `INSERT INTO notifications
            (user_id, type, title, body, payload, actor_id, collapse_key, dedupe_key)
         VALUES ${values.join(',')}
         ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
         RETURNING notification_id as id, user_id as "userId", type, title, body, payload,
                   actor_id as "actorId", collapse_key as "collapseKey",
                   created_at as "createdAt"`,
        params,
    );
    return result.rows;
}

export async function notifyUsers(input, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const publish = deps.publishToUser || publishToUser;
    const push = deps.sendWebPushToUsers || sendWebPushToUsers;

    const type = input.type;
    const actorId = input.actorId || null;
    const recipients = uniqueRecipients(input.recipientIds, actorId);
    if (!recipients.length) return [];

    const settingsMap = await loadSettingsMap(recipients, query);
    const allowed = recipients.filter((id) => settingEnabled(settingsMap.get(id) || {}, type));
    if (!allowed.length) return [];

    const inserted = await insertInbox(
        allowed.map((userId) => ({
            userId,
            type,
            title: input.title,
            body: input.body || '',
            payload: input.payload || {},
            actorId,
            collapseKey: input.collapseKey || null,
            dedupeKey: input.dedupeKey || null,
        })),
        query,
    );

    for (const row of inserted) {
        const frame = buildPushPayload(row);
        publish(row.userId, frame);
        void push([row.userId], frame);
    }

    return inserted;
}

export async function notifyChatMessage({
    chatId, messageId, actorId, actorName, body, mentionIds = [],
}, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const members = await query(
        `SELECT cm.user_id as "userId", c.name as "chatName"
         FROM chat_members cm
         JOIN chats c ON c.chat_id = cm.chat_id
         WHERE cm.chat_id = $1`,
        [chatId],
    );
    const chatName = members.rows[0]?.chatName;
    const memberIds = members.rows.map((r) => r.userId);
    const name = await loadActorName(actorId, actorName, query);
    const mentioned = uniqueRecipients(mentionIds, actorId).filter((id) => memberIds.includes(id));
    const others = memberIds.filter((id) => !mentioned.includes(id));
    const payload = {
        chatId,
        messageId,
        url: `/inbox?chat=${chatId}`,
        tag: `chat:${chatId}`,
    };
    const clipped = clipBody(body);
    const out = [];
    if (mentioned.length) {
        out.push(...await notifyUsers({
            type: TYPES.CHAT_MENTIONED,
            actorId,
            recipientIds: mentioned,
            title: `${name} ti ha citato`,
            body: clipped,
            collapseKey: `chat-mention:${chatId}`,
            payload,
        }, deps));
    }
    if (others.length) {
        out.push(...await notifyUsers({
            type: TYPES.CHAT_MESSAGE,
            actorId,
            recipientIds: others,
            title: chatName ? `${name} in ${chatName}` : name,
            body: clipped,
            collapseKey: `chat:${chatId}`,
            payload,
        }, deps));
    }
    return out;
}

export async function notifyTaskAssigned({
    taskId, projectId, title, actorId, actorName, recipientIds,
}, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const name = await loadActorName(actorId, actorName, query);
    return notifyUsers({
        type: TYPES.TASK_ASSIGNED,
        actorId,
        recipientIds,
        title: 'Task assegnato',
        body: clipBody(`${name} ti ha assegnato: ${title}`),
        collapseKey: `task:${taskId}`,
        dedupeKey: `task.assigned:${taskId}`,
        payload: {
            taskId,
            projectId: projectId || null,
            url: `/tasks?task=${taskId}`,
            tag: `task:${taskId}`,
        },
    }, deps);
}

export async function notifyTaskUpdated({
    taskId, projectId, title, actorId, actorName, recipientIds, statusLabel,
}, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const name = await loadActorName(actorId, actorName, query);
    const detail = statusLabel ? ` → ${statusLabel}` : '';
    return notifyUsers({
        type: TYPES.TASK_UPDATED,
        actorId,
        recipientIds,
        title: 'Aggiornamento sul lavoro',
        body: clipBody(`${name} ha aggiornato: ${title}${detail}`),
        collapseKey: `task-update:${taskId}`,
        payload: {
            taskId,
            projectId: projectId || null,
            url: `/tasks?task=${taskId}`,
            tag: `task-update:${taskId}`,
        },
    }, deps);
}

export async function loadTaskAssigneeIds(taskId, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const result = await query(
        'SELECT user_id as "userId" FROM task_assignees WHERE task_id = $1',
        [taskId],
    );
    return result.rows.map((r) => r.userId);
}

export async function notifyEventInvited({
    eventId, title, startTime, actorId, actorName, recipientIds, isCall = false,
}, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const name = await loadActorName(actorId, actorName, query);
    const when = startTime ? ` (${new Date(startTime).toLocaleString('it-IT')})` : '';
    return notifyUsers({
        type: TYPES.EVENT_INVITED,
        actorId,
        recipientIds,
        title: isCall ? 'Sei citato in una call' : 'Invito a un evento',
        body: clipBody(
            isCall
                ? `${name} ti ha citato per: ${title}${when}`
                : `${name} ti ha invitato: ${title}${when}`,
        ),
        collapseKey: `event:${eventId}`,
        dedupeKey: `event.invited:${eventId}`,
        payload: {
            eventId,
            isCall: Boolean(isCall),
            url: `/calendario?event=${eventId}`,
            tag: `event:${eventId}`,
        },
    }, deps);
}

export async function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
    const cap = Math.min(100, Math.max(1, Number(limit) || 50));
    const result = await pool.query(
        `SELECT notification_id as id, type, title, body, payload,
                actor_id as "actorId", collapse_key as "collapseKey",
                read_at as "readAt", created_at as "createdAt"
         FROM notifications
         WHERE user_id = $1
           AND ($2::boolean = false OR read_at IS NULL)
         ORDER BY created_at DESC
         LIMIT $3`,
        [userId, unreadOnly, cap],
    );
    return result.rows;
}

export async function unreadCount(userId) {
    const result = await pool.query(
        'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
        [userId],
    );
    return result.rows[0]?.count || 0;
}

export async function markRead(userId, notificationId) {
    const result = await pool.query(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, NOW())
         WHERE notification_id = $1 AND user_id = $2
         RETURNING notification_id as id, read_at as "readAt"`,
        [notificationId, userId],
    );
    return result.rows[0] || null;
}

export async function markAllRead(userId) {
    const result = await pool.query(
        `UPDATE notifications
         SET read_at = NOW()
         WHERE user_id = $1 AND read_at IS NULL
         RETURNING notification_id`,
        [userId],
    );
    return result.rowCount;
}

export async function getPreferences(userId) {
    const result = await pool.query(
        'SELECT settings FROM notification_preferences WHERE user_id = $1',
        [userId],
    );
    return mergedSettings(result.rows[0]?.settings);
}

export async function savePreferences(userId, settings) {
    const next = mergedSettings(settings);
    await pool.query(
        `INSERT INTO notification_preferences (user_id, settings, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET settings = EXCLUDED.settings, updated_at = NOW()`,
        [userId, JSON.stringify(next)],
    );
    return next;
}

export async function upsertSubscription(userId, data) {
    const expiration = data.expirationTime
        ? new Date(data.expirationTime)
        : null;
    const result = await pool.query(
        `INSERT INTO push_subscriptions
            (user_id, platform, endpoint, p256dh, auth, expiration_time, user_agent, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (endpoint) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            platform = EXCLUDED.platform,
            p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth,
            expiration_time = EXCLUDED.expiration_time,
            user_agent = EXCLUDED.user_agent,
            last_seen_at = NOW()
         RETURNING subscription_id as id, platform, endpoint, created_at as "createdAt"`,
        [
            userId,
            data.platform,
            data.endpoint,
            data.keys.p256dh,
            data.keys.auth,
            expiration,
            data.userAgent || null,
        ],
    );
    return result.rows[0];
}

export async function removeSubscription(userId, endpoint) {
    const result = await pool.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING subscription_id',
        [userId, endpoint],
    );
    return result.rowCount;
}

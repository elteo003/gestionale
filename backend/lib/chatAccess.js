import pool from '../database/connection.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value);
}

export async function isChatMember(userId, chatId) {
    if (!userId || !isUuid(chatId)) return false;
    const result = await pool.query(
        'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2 LIMIT 1',
        [chatId, userId],
    );
    return result.rows.length > 0;
}

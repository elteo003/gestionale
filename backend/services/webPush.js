import webpush from 'web-push';
import pool from '../database/connection.js';

let vapidReady = false;

export function isPushGoneStatus(status) {
    return status === 404 || status === 410;
}

export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || '';
}

export function vapidConfigured() {
    return Boolean(
        process.env.VAPID_PUBLIC_KEY
        && process.env.VAPID_PRIVATE_KEY
        && process.env.VAPID_SUBJECT,
    );
}

function ensureVapid() {
    if (vapidReady) return true;
    if (!vapidConfigured()) return false;
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    );
    vapidReady = true;
    return true;
}

export async function deleteSubscriptionByEndpoint(endpoint) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export async function sendWebPush(subscription, payload, send = webpush.sendNotification) {
    if (!ensureVapid()) return { ok: false, skipped: true };
    try {
        await send(
            {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(payload),
            { TTL: 3600, urgency: payload?.type === 'chat.message' ? 'high' : 'normal' },
        );
        return { ok: true };
    } catch (err) {
        const status = err?.statusCode;
        if (isPushGoneStatus(status)) {
            await deleteSubscriptionByEndpoint(subscription.endpoint);
            return { ok: false, gone: true };
        }
        console.error('Web Push:', status || err.message);
        return { ok: false, error: err.message };
    }
}

export async function sendWebPushToUsers(userIds, payload, deps = {}) {
    const query = deps.query || pool.query.bind(pool);
    const sendOne = deps.sendWebPush || sendWebPush;
    if (!userIds.length) return;
    if (!deps.sendWebPush && !ensureVapid()) return;

    const result = await query(
        `SELECT subscription_id as id, user_id as "userId", platform, endpoint, p256dh, auth
         FROM push_subscriptions
         WHERE user_id = ANY($1::uuid[])`,
        [userIds],
    );

    const jobs = result.rows.map((row) => sendOne(row, payload));
    await Promise.allSettled(jobs);
}

import pool from '../database/connection.js';
import { extractBearerOrCookie } from '../lib/authCookies.js';
import { verifyAccessToken, verifyAnyAccessToken } from '../lib/tokens.js';

const LAST_SEEN_INTERVAL_MS = 60_000;
const lastSeenUpdatedAt = new Map();

async function touchLastSeen(userId) {
    const now = Date.now();
    const prev = lastSeenUpdatedAt.get(userId) || 0;
    if (now - prev < LAST_SEEN_INTERVAL_MS) return;
    lastSeenUpdatedAt.set(userId, now);
    await pool.query('UPDATE users SET last_seen = NOW() WHERE user_id = $1', [userId]);
}

async function loadUser(decoded) {
    const result = await pool.query(
        `SELECT user_id, email, role, area, is_active
         FROM users WHERE user_id = $1`,
        [decoded.userId],
    );
    if (!result.rows.length) return null;
    const dbUser = result.rows[0];
    if (dbUser.is_active === false) return null;
    return {
        userId: dbUser.user_id,
        email: dbUser.email,
        role: dbUser.role,
        area: dbUser.area,
    };
}

export function verifyTokenString(token) {
    try {
        return verifyAccessToken(token);
    } catch {
        return verifyAnyAccessToken(token);
    }
}

export async function userFromAccessToken(token) {
    if (!token) return null;
    const decoded = verifyTokenString(token);
    return loadUser(decoded);
}

export function tokenFromCookieHeader(cookieHeader) {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
        const trimmed = part.trim();
        const eq = trimmed.indexOf('=');
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq);
        if (key === 'access_token') {
            return decodeURIComponent(trimmed.slice(eq + 1));
        }
    }
    return null;
}

export const authenticateToken = async (req, res, next) => {
    try {
        const token = extractBearerOrCookie(req);
        if (!token) {
            return res.status(401).json({ error: 'Token di autenticazione mancante' });
        }

        const decoded = verifyTokenString(token);
        const user = await loadUser(decoded);
        if (!user) {
            return res.status(403).json({ error: 'Utente non trovato o disattivato' });
        }

        req.user = user;
        touchLastSeen(user.userId).catch((err) =>
            console.error('Errore aggiornamento last_seen:', err),
        );
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token non valido o scaduto' });
        }
        console.error('Errore autenticazione:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

export const optionalAuth = async (req, res, next) => {
    const token = extractBearerOrCookie(req);
    if (!token) return next();

    try {
        const decoded = verifyTokenString(token);
        const user = await loadUser(decoded);
        if (user) req.user = user;
    } catch {
        /* opzionale */
    }
    next();
};

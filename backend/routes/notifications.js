import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateBody } from '../validators/authSchemas.js';
import {
    preferencesSchema,
    subscribeSchema,
    unsubscribeSchema,
} from '../validators/notificationSchemas.js';
import { isUuid } from '../lib/chatAccess.js';
import {
    getPreferences,
    listNotifications,
    markAllRead,
    markRead,
    removeSubscription,
    savePreferences,
    unreadCount,
    upsertSubscription,
} from '../services/notificationService.js';
import { getVapidPublicKey, vapidConfigured } from '../services/webPush.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/push/vapid-public-key', (req, res) => {
    if (!vapidConfigured()) {
        return res.status(503).json({ error: 'Push non configurato' });
    }
    res.json({ publicKey: getVapidPublicKey() });
});

router.post('/push/subscribe', validateBody(subscribeSchema), async (req, res) => {
    try {
        if (!vapidConfigured()) {
            return res.status(503).json({ error: 'Push non configurato' });
        }
        const sub = await upsertSubscription(req.user.userId, {
            ...req.body,
            userAgent: req.body.userAgent || req.get('user-agent') || null,
        });
        res.status(201).json(sub);
    } catch (error) {
        console.error('Errore push subscribe:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.delete('/push/subscribe', validateBody(unsubscribeSchema), async (req, res) => {
    try {
        const n = await removeSubscription(req.user.userId, req.body.endpoint);
        if (!n) return res.status(404).json({ error: 'Sottoscrizione non trovata' });
        res.json({ message: 'Sottoscrizione rimossa' });
    } catch (error) {
        console.error('Errore push unsubscribe:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.get('/notifications/preferences', async (req, res) => {
    try {
        const settings = await getPreferences(req.user.userId);
        res.json({ settings });
    } catch (error) {
        console.error('Errore get preferences:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.patch('/notifications/preferences', validateBody(preferencesSchema), async (req, res) => {
    try {
        const current = await getPreferences(req.user.userId);
        const settings = await savePreferences(req.user.userId, {
            ...current,
            ...req.body.settings,
        });
        res.json({ settings });
    } catch (error) {
        console.error('Errore patch preferences:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.get('/notifications/unread-count', async (req, res) => {
    try {
        const count = await unreadCount(req.user.userId);
        res.json({ count });
    } catch (error) {
        console.error('Errore unread-count:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
        const items = await listNotifications(req.user.userId, {
            unreadOnly,
            limit: req.query.limit,
        });
        res.json(items);
    } catch (error) {
        console.error('Errore list notifications:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.patch('/notifications/:id/read', async (req, res) => {
    try {
        if (!isUuid(req.params.id)) {
            return res.status(400).json({ error: 'Notifica non valida' });
        }
        const row = await markRead(req.user.userId, req.params.id);
        if (!row) return res.status(404).json({ error: 'Notifica non trovata' });
        res.json(row);
    } catch (error) {
        console.error('Errore mark read:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.post('/notifications/read-all', async (req, res) => {
    try {
        const updated = await markAllRead(req.user.userId);
        res.json({ updated });
    } catch (error) {
        console.error('Errore read-all:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;

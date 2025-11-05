import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/events/:id/reports - Lista tutti i report di un evento
router.get('/:eventId/reports', async (req, res) => {
    try {
        const { eventId } = req.params;

        // Verifica che l'evento esista
        const eventCheck = await pool.query(
            'SELECT event_id FROM events WHERE event_id = $1',
            [eventId]
        );

        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        // Recupera i report con informazioni sul creatore
        const result = await pool.query(
            `SELECT r.report_id as id, r.event_id as "eventId",
                    r.creator_user_id as "creatorUserId",
                    r.report_content as "reportContent",
                    r.created_at as "createdAt", r.updated_at as "updatedAt",
                    u.name as "creatorName", u.email as "creatorEmail"
             FROM event_reports r
             JOIN users u ON r.creator_user_id = u.user_id
             WHERE r.event_id = $1
             ORDER BY r.created_at DESC`,
            [eventId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero report evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/events/:id/reports - Crea nuovo report/verbale
router.post('/:eventId/reports', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { reportContent } = req.body;

        if (!reportContent || reportContent.trim().length === 0) {
            return res.status(400).json({ error: 'Il contenuto del report è obbligatorio' });
        }

        // Verifica che l'evento esista
        const eventCheck = await pool.query(
            'SELECT event_id, creator_id FROM events WHERE event_id = $1',
            [eventId]
        );

        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        // Verifica permessi: solo Manager, CDA, Admin, Responsabile o creatore dell'evento
        const canCreateReport = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente' ||
            eventCheck.rows[0].creator_id === req.user.userId;

        if (!canCreateReport) {
            return res.status(403).json({ 
                error: 'Non hai i permessi per creare report per questo evento' 
            });
        }

        // Crea il report
        const result = await pool.query(
            `INSERT INTO event_reports (event_id, creator_user_id, report_content)
             VALUES ($1, $2, $3)
             RETURNING report_id as id, event_id as "eventId",
                       creator_user_id as "creatorUserId",
                       report_content as "reportContent",
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [eventId, req.user.userId, reportContent]
        );

        // Recupera informazioni sul creatore
        const creatorResult = await pool.query(
            'SELECT name, email FROM users WHERE user_id = $1',
            [req.user.userId]
        );

        res.status(201).json({
            ...result.rows[0],
            creatorName: creatorResult.rows[0]?.name,
            creatorEmail: creatorResult.rows[0]?.email
        });
    } catch (error) {
        console.error('Errore creazione report evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/events/:id/reports/:reportId - Aggiorna report
router.put('/:eventId/reports/:reportId', async (req, res) => {
    try {
        const { eventId, reportId } = req.params;
        const { reportContent } = req.body;

        if (!reportContent || reportContent.trim().length === 0) {
            return res.status(400).json({ error: 'Il contenuto del report è obbligatorio' });
        }

        // Verifica che il report esista e appartenga all'evento
        const reportCheck = await pool.query(
            'SELECT creator_user_id FROM event_reports WHERE report_id = $1 AND event_id = $2',
            [reportId, eventId]
        );

        if (reportCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Report non trovato' });
        }

        // Solo il creatore può modificare
        if (reportCheck.rows[0].creator_user_id !== req.user.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Non hai i permessi per modificare questo report' });
        }

        // Aggiorna il report
        const result = await pool.query(
            `UPDATE event_reports
             SET report_content = $1, updated_at = CURRENT_TIMESTAMP
             WHERE report_id = $2
             RETURNING report_id as id, event_id as "eventId",
                       creator_user_id as "creatorUserId",
                       report_content as "reportContent",
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [reportContent, reportId]
        );

        // Recupera informazioni sul creatore
        const creatorResult = await pool.query(
            'SELECT name, email FROM users WHERE user_id = $1',
            [result.rows[0].creatorUserId]
        );

        res.json({
            ...result.rows[0],
            creatorName: creatorResult.rows[0]?.name,
            creatorEmail: creatorResult.rows[0]?.email
        });
    } catch (error) {
        console.error('Errore aggiornamento report evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/events/:id/reports/:reportId - Elimina report
router.delete('/:eventId/reports/:reportId', async (req, res) => {
    try {
        const { eventId, reportId } = req.params;

        // Verifica che il report esista
        const reportCheck = await pool.query(
            'SELECT creator_user_id FROM event_reports WHERE report_id = $1 AND event_id = $2',
            [reportId, eventId]
        );

        if (reportCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Report non trovato' });
        }

        // Solo il creatore o Admin può eliminare
        if (reportCheck.rows[0].creator_user_id !== req.user.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Non hai i permessi per eliminare questo report' });
        }

        await pool.query('DELETE FROM event_reports WHERE report_id = $1', [reportId]);

        res.json({ message: 'Report eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione report evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


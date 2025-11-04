import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/contracts - Lista tutti i contratti
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.contract_id as id, c.type, c.amount, c.status, c.date,
                    c.client_id as "clientId", c.project_id as "projectId",
                    cl.name as "clientName", p.name as "projectName",
                    c.created_at as "createdAt"
             FROM contracts c
             LEFT JOIN clients cl ON c.client_id = cl.client_id
             LEFT JOIN projects p ON c.project_id = p.project_id
             ORDER BY c.date DESC, c.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero contratti:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/contracts/:id - Dettaglio contratto
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT c.contract_id as id, c.type, c.amount, c.status, c.date,
                    c.client_id as "clientId", c.project_id as "projectId",
                    cl.name as "clientName", p.name as "projectName",
                    c.created_at as "createdAt"
             FROM contracts c
             LEFT JOIN clients cl ON c.client_id = cl.client_id
             LEFT JOIN projects p ON c.project_id = p.project_id
             WHERE c.contract_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contratto non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore recupero contratto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/contracts - Crea nuovo contratto
router.post('/', async (req, res) => {
    try {
        const { type, clientId, projectId, amount, status, date } = req.body;

        if (!type || !clientId || !amount || !date) {
            return res.status(400).json({ error: 'Tipo, cliente, importo e data sono obbligatori' });
        }

        const result = await pool.query(
            `INSERT INTO contracts (type, client_id, project_id, amount, status, date, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING contract_id as id, type, client_id as "clientId", 
                       project_id as "projectId", amount, status, date, created_at as "createdAt"`,
            [type, clientId, projectId || null, amount, status || 'Bozza', date, req.user.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione contratto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/contracts/:id - Aggiorna contratto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, clientId, projectId, amount, status, date } = req.body;

        const result = await pool.query(
            `UPDATE contracts
             SET type = COALESCE($1, type),
                 client_id = COALESCE($2, client_id),
                 project_id = COALESCE($3, project_id),
                 amount = COALESCE($4, amount),
                 status = COALESCE($5, status),
                 date = COALESCE($6, date),
                 updated_at = CURRENT_TIMESTAMP
             WHERE contract_id = $7
             RETURNING contract_id as id, type, client_id as "clientId", 
                       project_id as "projectId", amount, status, date, created_at as "createdAt"`,
            [type, clientId, projectId, amount, status, date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contratto non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento contratto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/contracts/:id/status - Aggiorna solo lo stato
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Stato richiesto' });
        }

        const result = await pool.query(
            `UPDATE contracts
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE contract_id = $2
             RETURNING contract_id as id, type, client_id as "clientId", 
                       project_id as "projectId", amount, status, date, created_at as "createdAt"`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contratto non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento stato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/contracts/:id - Elimina contratto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM contracts WHERE contract_id = $1 RETURNING contract_id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contratto non trovato' });
        }

        res.json({ message: 'Contratto eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione contratto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


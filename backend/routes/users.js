import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/users - Lista tutti gli utenti (solo per admin o per vedere membri)
router.get('/', async (req, res) => {
    try {
        // Solo admin può vedere tutti gli utenti, altrimenti solo nome e area
        const query = req.user.role === 'Admin'
            ? `SELECT user_id as id, name, email, area, role, created_at as "createdAt"
               FROM users
               ORDER BY name ASC`
            : `SELECT user_id as id, name, area, role
               FROM users
               ORDER BY name ASC`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero utenti:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/users/:id - Dettaglio utente
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Gli utenti possono vedere solo i propri dati dettagliati (tranne admin)
        if (id !== req.user.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Non hai i permessi per vedere questi dati' });
        }

        const result = await pool.query(
            `SELECT user_id as id, name, email, area, role, created_at as "createdAt"
             FROM users
             WHERE user_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore recupero utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/candidates - Lista tutti i candidati (filtrati per area se Manager)
router.get('/', async (req, res) => {
    try {
        // Verifica permessi: solo Manager, CDA, Admin, Responsabile, Presidente
        const canView = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente';

        if (!canView) {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        let query = `
            SELECT c.candidate_id as id, c.name, c.email, c.cv_url as "cvUrl",
                   c.status, c.area_competenza as "areaCompetenza",
                   c.created_at as "createdAt", c.updated_at as "updatedAt",
                   u.name as "createdByName"
            FROM candidates c
            LEFT JOIN users u ON c.created_by = u.user_id
        `;

        const params = [];
        let paramIndex = 1;

        // Manager vede solo candidati della sua area
        if (req.user.role === 'Manager' && req.user.area) {
            query += ` WHERE c.area_competenza = $${paramIndex}`;
            params.push(req.user.area);
            paramIndex++;
        }

        query += ` ORDER BY c.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero candidati:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/candidates/:id - Dettaglio candidato
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica permessi
        const canView = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente';

        if (!canView) {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        const result = await pool.query(
            `SELECT c.candidate_id as id, c.name, c.email, c.cv_url as "cvUrl",
                    c.status, c.area_competenza as "areaCompetenza",
                    c.created_at as "createdAt", c.updated_at as "updatedAt",
                    u.name as "createdByName"
             FROM candidates c
             LEFT JOIN users u ON c.created_by = u.user_id
             WHERE c.candidate_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Candidato non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore recupero candidato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/candidates - Crea nuovo candidato
router.post('/', async (req, res) => {
    try {
        const { name, email, cvUrl, areaCompetenza } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nome ed email sono obbligatori' });
        }

        // Verifica permessi
        const canCreate = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente';

        if (!canCreate) {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        // Verifica se l'email esiste già
        const existingCandidate = await pool.query(
            'SELECT candidate_id FROM candidates WHERE email = $1',
            [email]
        );

        if (existingCandidate.rows.length > 0) {
            return res.status(400).json({ error: 'Email già registrata per un altro candidato' });
        }

        const result = await pool.query(
            `INSERT INTO candidates (name, email, cv_url, area_competenza, created_by, status)
             VALUES ($1, $2, $3, $4, $5, 'In attesa')
             RETURNING candidate_id as id, name, email, cv_url as "cvUrl",
                       status, area_competenza as "areaCompetenza",
                       created_at as "createdAt"`,
            [name, email, cvUrl || null, areaCompetenza || null, req.user.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione candidato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/candidates/:id - Aggiorna candidato
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, cvUrl, status, areaCompetenza } = req.body;

        // Verifica permessi
        const canUpdate = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente';

        if (!canUpdate) {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        // Verifica se il candidato esiste
        const existingResult = await pool.query(
            'SELECT candidate_id FROM candidates WHERE candidate_id = $1',
            [id]
        );

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Candidato non trovato' });
        }

        // Verifica email unica (se modificata)
        if (email) {
            const emailCheck = await pool.query(
                'SELECT candidate_id FROM candidates WHERE email = $1 AND candidate_id != $2',
                [email, id]
            );

            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email già registrata per un altro candidato' });
            }
        }

        const result = await pool.query(
            `UPDATE candidates
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 cv_url = COALESCE($3, cv_url),
                 status = COALESCE($4, status),
                 area_competenza = COALESCE($5, area_competenza),
                 updated_at = CURRENT_TIMESTAMP
             WHERE candidate_id = $6
             RETURNING candidate_id as id, name, email, cv_url as "cvUrl",
                       status, area_competenza as "areaCompetenza",
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [name, email, cvUrl, status, areaCompetenza, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento candidato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/candidates/:id - Elimina candidato
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica permessi
        const canDelete = 
            req.user.role === 'Admin' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Presidente';

        if (!canDelete) {
            return res.status(403).json({ error: 'Accesso negato. Solo Admin, CDA e Presidente possono eliminare candidati' });
        }

        const result = await pool.query(
            'DELETE FROM candidates WHERE candidate_id = $1 RETURNING candidate_id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Candidato non trovato' });
        }

        res.json({ message: 'Candidato eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione candidato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// POST /api/onboarding/start - Avvia periodo di prova per un candidato accettato
router.post('/start', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { candidateId } = req.body;

        if (!candidateId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'candidateId è obbligatorio' });
        }

        // Verifica permessi: solo Manager, CDA, Admin, Responsabile, Presidente
        const canStart = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente';

        if (!canStart) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Accesso negato' });
        }

        // Recupera il candidato
        const candidateResult = await client.query(
            `SELECT candidate_id, name, email, area_competenza, status
             FROM candidates WHERE candidate_id = $1`,
            [candidateId]
        );

        if (candidateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Candidato non trovato' });
        }

        const candidate = candidateResult.rows[0];

        // Verifica che il candidato sia accettato
        if (candidate.status !== 'Accettato') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: `Il candidato deve essere in stato "Accettato" (stato attuale: ${candidate.status})` 
            });
        }

        // Verifica se esiste già un utente con questa email
        const existingUser = await client.query(
            'SELECT user_id FROM users WHERE email = $1',
            [candidate.email]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Esiste già un utente con questa email. Il periodo di prova potrebbe essere già stato avviato.' 
            });
        }

        // Azione 1: Crea nuovo User
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const userResult = await client.query(
            `INSERT INTO users (name, email, password_hash, area, role, is_active)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING user_id as id, name, email, area, role, created_at as "createdAt"`,
            [
                candidate.name,
                candidate.email,
                passwordHash,
                candidate.area_competenza || req.user.area || null,
                'Associato (Prova)'
            ]
        );

        const newUser = userResult.rows[0];

        // Azione 2: Crea nuovo Project (Periodo di Prova)
        const projectResult = await client.query(
            `INSERT INTO projects (name, client_id, area, status, created_by)
             VALUES ($1, NULL, $2, 'In Corso', $3)
             RETURNING project_id as id, name, area, status, created_at as "createdAt"`,
            [
                `Periodo di Prova: ${candidate.name}`,
                candidate.area_competenza || req.user.area || null,
                req.user.userId
            ]
        );

        const project = projectResult.rows[0];

        // Assegna automaticamente il nuovo utente al progetto
        await client.query(
            `INSERT INTO project_assignments (project_id, user_id)
             VALUES ($1, $2)`,
            [project.id, newUser.id]
        );

        // Aggiorna lo stato del candidato a "In colloquio" (per indicare che è in onboarding)
        await client.query(
            `UPDATE candidates SET status = 'In colloquio' WHERE candidate_id = $1`,
            [candidateId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Periodo di prova avviato con successo',
            user: {
                ...newUser,
                tempPassword // In produzione, inviare via email invece di restituire
            },
            project: {
                ...project,
                assignedUserId: newUser.id
            },
            warning: 'La password temporanea è stata generata. In produzione, inviala via email al candidato.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore avvio periodo di prova:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    } finally {
        client.release();
    }
});

export default router;


import express from 'express';
import pool from '../database/connection.js';
import bcrypt from 'bcrypt';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Middleware per verificare se l'utente è admin o IT Manager
const isAdminOrIT = (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'IT' || req.user.role === 'Responsabile') {
        next();
    } else {
        res.status(403).json({ error: 'Accesso negato. Solo Admin/IT Manager possono accedere.' });
    }
};

// GET /api/users - Lista tutti gli utenti
router.get('/', async (req, res) => {
    try {
        // Solo admin può vedere tutti gli utenti, altrimenti solo nome e area
        const query = req.user.role === 'Admin' || req.user.role === 'IT' || req.user.role === 'Responsabile'
            ? `SELECT user_id as id, name, email, area, role, is_active, last_seen, created_at as "createdAt"
               FROM users
               ORDER BY name ASC`
            : `SELECT user_id as id, name, area, role
               FROM users
               WHERE is_active = TRUE
               ORDER BY name ASC`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero utenti:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/users/online - Utenti connessi ultimi 5 minuti
router.get('/online', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT user_id as id, name, email, area, role, last_seen
             FROM users
             WHERE last_seen > NOW() - INTERVAL '5 minutes'
             ORDER BY last_seen DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero utenti online:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/users - Crea nuovo utente (solo admin)
router.post('/', isAdminOrIT, async (req, res) => {
    try {
        const { name, email, password, area, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e password sono obbligatori' });
        }

        // Verifica se l'email esiste già
        const existingUser = await pool.query(
            'SELECT user_id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email già registrata' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Inserisci nuovo utente
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, area, role, is_active)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING user_id as id, name, email, area, role, is_active, created_at as "createdAt"`,
            [name, email, passwordHash, area || null, role || 'Socio']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/users/:id - Modifica utente (solo admin)
router.put('/:id', isAdminOrIT, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, area, role } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 area = COALESCE($3, area),
                 role = COALESCE($4, role),
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $5
             RETURNING user_id as id, name, email, area, role, is_active, created_at as "createdAt"`,
            [name, email, area, role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore modifica utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/users/:id/reset-password - Reimposta password (solo admin)
router.patch('/:id/reset-password', isAdminOrIT, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password deve avere almeno 6 caratteri' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        const result = await pool.query(
            `UPDATE users 
             SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
             RETURNING user_id as id, name, email`,
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json({ message: 'Password reimpostata con successo' });
    } catch (error) {
        console.error('Errore reset password:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/users/:id/status - Disattiva/Attiva utente (solo admin)
router.patch('/:id/status', isAdminOrIT, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({ error: 'isActive è richiesto' });
        }

        // Previeni disattivazione di se stesso
        if (id === req.user.userId && !isActive) {
            return res.status(400).json({ error: 'Non puoi disattivare il tuo stesso account' });
        }

        const result = await pool.query(
            `UPDATE users 
             SET is_active = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
             RETURNING user_id as id, name, email, is_active`,
            [isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore modifica stato utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/users/:id - Dettaglio utente
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Gli utenti possono vedere solo i propri dati dettagliati (tranne admin)
        if (id !== req.user.userId && req.user.role !== 'Admin' && req.user.role !== 'IT' && req.user.role !== 'Responsabile') {
            return res.status(403).json({ error: 'Non hai i permessi per vedere questi dati' });
        }

        const result = await pool.query(
            `SELECT user_id as id, name, email, area, role, is_active, last_seen, created_at as "createdAt"
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


import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database/connection.js';

const router = express.Router();

// Registrazione nuovo utente
router.post('/register', async (req, res) => {
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
            `INSERT INTO users (name, email, password_hash, area, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING user_id, name, email, area, role, created_at`,
            [name, email, passwordHash, area || null, role || 'Socio']
        );

        const user = result.rows[0];

        // Genera JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registrazione completata',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                area: user.area,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Errore registrazione:', error);
        console.error('Stack:', error.stack);
        
        // Se è un errore di connessione database
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(500).json({ 
                error: 'Errore di connessione al database. Verifica che il database sia configurato correttamente.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Errore interno del server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e password sono obbligatori' });
        }

        // Trova utente
        const result = await pool.query(
            'SELECT user_id, name, email, password_hash, area, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const user = result.rows[0];

        // Verifica password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        // Genera JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login effettuato con successo',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                area: user.area,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Errore login:', error);
        console.error('Stack:', error.stack);
        
        // Se è un errore di connessione database
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(500).json({ 
                error: 'Errore di connessione al database. Verifica che il database sia configurato correttamente.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Errore interno del server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Verifica token (per verificare se l'utente è ancora loggato)
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token mancante' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Recupera dati utente aggiornati
        const result = await pool.query(
            'SELECT user_id, name, email, area, role FROM users WHERE user_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json({
            user: {
                id: result.rows[0].user_id,
                name: result.rows[0].name,
                email: result.rows[0].email,
                area: result.rows[0].area,
                role: result.rows[0].role
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token non valido o scaduto' });
        }
        console.error('Errore verifica token:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


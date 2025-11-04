import jwt from 'jsonwebtoken';
import pool from '../database/connection.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token di autenticazione mancante' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token non valido o scaduto' });
        }
        req.user = user;
        
        // Aggiorna last_seen in modo asincrono (non blocca la risposta)
        if (user.userId) {
            pool.query('UPDATE users SET last_seen = NOW() WHERE user_id = $1', [user.userId])
                .catch(err => console.error('Errore aggiornamento last_seen:', err));
        }
        
        next();
    });
};

export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
};


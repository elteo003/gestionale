import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(authenticateToken);

// GET /api/clients - Lista tutti i clienti
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT client_id as id, name, contact_person as "contactPerson", 
                    email, phone, status, area, created_at as "createdAt", version
             FROM clients
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero clienti:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/clients/:id - Dettaglio cliente
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT client_id as id, name, contact_person as "contactPerson", 
                    email, phone, status, area, created_at as "createdAt", version
             FROM clients
             WHERE client_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore recupero cliente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/clients - Crea nuovo cliente
router.post('/', async (req, res) => {
    try {
        const { name, contactPerson, email, phone, status, area } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e email sono obbligatori' });
        }

        const result = await pool.query(
            `INSERT INTO clients (name, contact_person, email, phone, status, area, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING client_id as id, name, contact_person as "contactPerson", 
                       email, phone, status, area, created_at as "createdAt"`,
            [name, contactPerson || null, email, phone || null, status || 'Prospect', area || null, req.user.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione cliente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/clients/:id - Aggiorna cliente con optimistic locking
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactPerson, email, phone, status, area, expectedVersion } = req.body;

        // Se expectedVersion è fornito, verifica che corrisponda
        if (expectedVersion !== undefined) {
            const currentCheck = await pool.query(
                'SELECT version FROM clients WHERE client_id = $1',
                [id]
            );

            if (currentCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Cliente non trovato' });
            }

            const currentVersion = currentCheck.rows[0].version;
            if (currentVersion !== expectedVersion) {
                const serverData = await pool.query(
                    `SELECT client_id as id, name, contact_person as "contactPerson", 
                            email, phone, status, area, version, created_at as "createdAt"
                     FROM clients WHERE client_id = $1`,
                    [id]
                );

                return res.status(409).json({
                    error: 'CONCURRENT_MODIFICATION',
                    message: 'Il cliente è stato modificato da un altro utente. Ricarica i dati per vedere le modifiche.',
                    currentVersion: currentVersion,
                    expectedVersion: expectedVersion,
                    serverData: serverData.rows[0]
                });
            }
        }

        const result = await pool.query(
            `UPDATE clients
             SET name = COALESCE($1, name),
                 contact_person = COALESCE($2, contact_person),
                 email = COALESCE($3, email),
                 phone = COALESCE($4, phone),
                 status = COALESCE($5, status),
                 area = COALESCE($6, area),
                 updated_at = CURRENT_TIMESTAMP
             WHERE client_id = $7
             RETURNING client_id as id, name, contact_person as "contactPerson", 
                       email, phone, status, area, version, created_at as "createdAt"`,
            [name, contactPerson, email, phone, status, area, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento cliente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/clients/:id/status - Aggiorna solo lo stato
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Stato richiesto' });
        }

        const result = await pool.query(
            `UPDATE clients
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE client_id = $2
             RETURNING client_id as id, name, contact_person as "contactPerson", 
                       email, phone, status, area, created_at as "createdAt"`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento stato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/clients/:id - Elimina cliente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM clients WHERE client_id = $1 RETURNING client_id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }

        res.json({ message: 'Cliente eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione cliente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


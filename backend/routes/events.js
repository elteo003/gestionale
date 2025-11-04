import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/events - Lista tutti gli eventi (con filtri opzionali)
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, isCall } = req.query;

        let query = `
            SELECT e.event_id as id, e.title, e.description, 
                   e.start_time as "startTime", e.end_time as "endTime",
                   e.is_call as "isCall", e.call_link as "callLink",
                   e.creator_id as "creatorId",
                   u.name as "creatorName", e.created_at as "createdAt"
            FROM events e
            LEFT JOIN users u ON e.creator_id = u.user_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (startDate) {
            query += ` AND e.start_time >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND e.end_time <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        if (isCall !== undefined) {
            query += ` AND e.is_call = $${paramIndex}`;
            params.push(isCall === 'true');
            paramIndex++;
        }

        query += ` ORDER BY e.start_time ASC`;

        const result = await pool.query(query, params);

        // Per ogni evento, aggiungi informazioni sui partecipanti
        const eventsWithParticipants = await Promise.all(
            result.rows.map(async (event) => {
                const participantsResult = await pool.query(
                    `SELECT p.participant_id as id, p.status,
                            u.user_id as "userId", u.name as "userName", u.email as "userEmail"
                     FROM participants p
                     JOIN users u ON p.user_id = u.user_id
                     WHERE p.event_id = $1`,
                    [event.id]
                );
                return { ...event, participants: participantsResult.rows };
            })
        );

        res.json(eventsWithParticipants);
    } catch (error) {
        console.error('Errore recupero eventi:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/events/:id - Dettaglio evento
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const eventResult = await pool.query(
            `SELECT e.event_id as id, e.title, e.description, 
                    e.start_time as "startTime", e.end_time as "endTime",
                    e.is_call as "isCall", e.call_link as "callLink",
                    e.creator_id as "creatorId",
                    u.name as "creatorName", e.created_at as "createdAt"
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.user_id
             WHERE e.event_id = $1`,
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        const participantsResult = await pool.query(
            `SELECT p.participant_id as id, p.status,
                    u.user_id as "userId", u.name as "userName", u.email as "userEmail"
             FROM participants p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.event_id = $1`,
            [id]
        );

        res.json({ ...eventResult.rows[0], participants: participantsResult.rows });
    } catch (error) {
        console.error('Errore recupero evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/events/:id/participants - Lista partecipanti di un evento
router.get('/:id/participants', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT p.participant_id as id, p.status,
                    u.user_id as "userId", u.name as "userName", u.email as "userEmail", u.area
             FROM participants p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.event_id = $1
             ORDER BY u.name ASC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero partecipanti:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/events - Crea nuovo evento
router.post('/', async (req, res) => {
    try {
        const { title, description, startTime, endTime, isCall, participantIds } = req.body;

        if (!title || !startTime || !endTime) {
            return res.status(400).json({ error: 'Titolo, data inizio e fine sono obbligatori' });
        }

        if (new Date(endTime) <= new Date(startTime)) {
            return res.status(400).json({ error: 'La data di fine deve essere successiva alla data di inizio' });
        }

        const { callLink } = req.body;

        // Inserisci evento
        const eventResult = await pool.query(
            `INSERT INTO events (title, description, start_time, end_time, is_call, call_link, creator_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING event_id as id, title, description, 
                       start_time as "startTime", end_time as "endTime",
                       is_call as "isCall", call_link as "callLink",
                       creator_id as "creatorId", created_at as "createdAt"`,
            [title, description || null, startTime, endTime, isCall || false, callLink || null, req.user.userId]
        );

        const event = eventResult.rows[0];

        // Se è una call e ci sono partecipanti, aggiungili
        if (isCall && participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
            const participantValues = participantIds.map((userId, index) => {
                const baseIndex = index * 2;
                return `($${baseIndex + 1}, $${baseIndex + 2}, 'pending')`;
            }).join(', ');

            const participantParams = participantIds.flatMap(userId => [event.id, userId]);

            await pool.query(
                `INSERT INTO participants (event_id, user_id, status)
                 VALUES ${participantValues}`,
                participantParams
            );
        }

        // Recupera i partecipanti creati
        const participantsResult = await pool.query(
            `SELECT p.participant_id as id, p.status,
                    u.user_id as "userId", u.name as "userName", u.email as "userEmail"
             FROM participants p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.event_id = $1`,
            [event.id]
        );

        res.status(201).json({ ...event, participants: participantsResult.rows });
    } catch (error) {
        console.error('Errore creazione evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/events/:id - Aggiorna evento
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, startTime, endTime, isCall } = req.body;

        // Verifica che l'utente sia il creatore dell'evento
        const checkResult = await pool.query(
            'SELECT creator_id FROM events WHERE event_id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        if (checkResult.rows[0].creator_id !== req.user.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Non hai i permessi per modificare questo evento' });
        }

        const { callLink } = req.body;

        const result = await pool.query(
            `UPDATE events
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 start_time = COALESCE($3, start_time),
                 end_time = COALESCE($4, end_time),
                 is_call = COALESCE($5, is_call),
                 call_link = COALESCE($6, call_link),
                 updated_at = CURRENT_TIMESTAMP
             WHERE event_id = $7
             RETURNING event_id as id, title, description, 
                       start_time as "startTime", end_time as "endTime",
                       is_call as "isCall", call_link as "callLink",
                       creator_id as "creatorId", created_at as "createdAt"`,
            [title, description, startTime, endTime, isCall, callLink, id]
        );

        // Recupera i partecipanti
        const participantsResult = await pool.query(
            `SELECT p.participant_id as id, p.status,
                    u.user_id as "userId", u.name as "userName", u.email as "userEmail"
             FROM participants p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.event_id = $1`,
            [id]
        );

        res.json({ ...result.rows[0], participants: participantsResult.rows });
    } catch (error) {
        console.error('Errore aggiornamento evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/events/:id - Elimina evento
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica che l'utente sia il creatore dell'evento
        const checkResult = await pool.query(
            'SELECT creator_id FROM events WHERE event_id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        if (checkResult.rows[0].creator_id !== req.user.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Non hai i permessi per eliminare questo evento' });
        }

        await pool.query('DELETE FROM events WHERE event_id = $1', [id]);

        res.json({ message: 'Evento eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione evento:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/events/:id/rsvp - RSVP (Accetta/Rifiuta invito)
router.post('/:id/rsvp', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['accepted', 'declined'].includes(status)) {
            return res.status(400).json({ error: 'Stato deve essere "accepted" o "declined"' });
        }

        // Verifica che l'evento esista
        const eventResult = await pool.query(
            'SELECT event_id FROM events WHERE event_id = $1',
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        // Verifica se esiste già un partecipante
        const existingParticipant = await pool.query(
            'SELECT participant_id FROM participants WHERE event_id = $1 AND user_id = $2',
            [id, req.user.userId]
        );

        if (existingParticipant.rows.length > 0) {
            // Aggiorna lo stato esistente
            const updateResult = await pool.query(
                `UPDATE participants
                 SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE event_id = $2 AND user_id = $3
                 RETURNING participant_id as id, status`,
                [status, id, req.user.userId]
            );

            return res.json({
                message: `RSVP ${status === 'accepted' ? 'accettato' : 'rifiutato'} con successo`,
                participant: updateResult.rows[0]
            });
        } else {
            // Crea nuovo partecipante
            const insertResult = await pool.query(
                `INSERT INTO participants (event_id, user_id, status)
                 VALUES ($1, $2, $3)
                 RETURNING participant_id as id, status`,
                [id, req.user.userId, status]
            );

            return res.status(201).json({
                message: `RSVP ${status === 'accepted' ? 'accettato' : 'rifiutato'} con successo`,
                participant: insertResult.rows[0]
            });
        }
    } catch (error) {
        console.error('Errore RSVP:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/events/my/upcoming - Eventi futuri dell'utente loggato
router.get('/my/upcoming', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.event_id as id, e.title, e.description, 
                    e.start_time as "startTime", e.end_time as "endTime",
                    e.is_call as "isCall", e.call_link as "callLink",
                    e.creator_id as "creatorId",
                    u.name as "creatorName", p.status as "myStatus"
             FROM events e
             JOIN participants p ON e.event_id = p.event_id
             LEFT JOIN users u ON e.creator_id = u.user_id
             WHERE p.user_id = $1 AND e.start_time > NOW()
             ORDER BY e.start_time ASC`,
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero eventi utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


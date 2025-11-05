import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * Espande le regole di invito in un array di user_id unici (stessa logica di events.js)
 */
async function expandInvites(rules) {
    if (!rules) return [];
    
    const userIds = new Set();
    
    if (rules.groups && Array.isArray(rules.groups)) {
        for (const group of rules.groups) {
            let query = '';
            
            if (group === 'manager' || group === 'Manager') {
                query = `SELECT user_id FROM users WHERE role IN ('Manager', 'Responsabile', 'Presidente', 'CDA', 'Tesoreria', 'Audit') AND is_active = TRUE`;
            } else if (group === 'cda' || group === 'CDA') {
                query = `SELECT user_id FROM users WHERE role = 'CDA' AND is_active = TRUE`;
            } else if (group === 'associati' || group === 'Associati' || group === 'socio' || group === 'Socio') {
                query = `SELECT user_id FROM users WHERE role = 'Socio' AND is_active = TRUE`;
            } else if (group === 'it' || group === 'IT') {
                query = `SELECT user_id FROM users WHERE area = 'IT' AND is_active = TRUE`;
            } else if (group === 'marketing' || group === 'Marketing') {
                query = `SELECT user_id FROM users WHERE area = 'Marketing' AND is_active = TRUE`;
            } else if (group === 'commerciale' || group === 'Commerciale') {
                query = `SELECT user_id FROM users WHERE area = 'Commerciale' AND is_active = TRUE`;
            }
            
            if (query) {
                const result = await pool.query(query);
                result.rows.forEach(row => userIds.add(row.user_id));
            }
        }
    }
    
    if (rules.individuals && Array.isArray(rules.individuals)) {
        rules.individuals.forEach(userId => {
            if (userId) userIds.add(userId);
        });
    }
    
    if (rules.area) {
        const areaResult = await pool.query(
            `SELECT user_id FROM users WHERE area = $1 AND is_active = TRUE`,
            [rules.area]
        );
        areaResult.rows.forEach(row => userIds.add(row.user_id));
    }
    
    return Array.from(userIds);
}

// GET /api/polls - Lista tutti i sondaggi (con filtri)
router.get('/', async (req, res) => {
    try {
        const { status, creatorId } = req.query;
        
        let query = `
            SELECT p.poll_id as id, p.title, p.duration_minutes as "durationMinutes",
                   p.invitation_rules as "invitationRules", p.status,
                   p.final_event_id as "finalEventId",
                   p.created_at as "createdAt",
                   u.name as "creatorName", u.email as "creatorEmail",
                   p.creator_user_id as "creatorUserId"
            FROM scheduling_polls p
            LEFT JOIN users u ON p.creator_user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND p.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (creatorId) {
            query += ` AND p.creator_user_id = $${paramIndex}`;
            params.push(creatorId);
            paramIndex++;
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero sondaggi:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/polls/:id - Dettaglio sondaggio con slot e voti
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Recupera il sondaggio
        const pollResult = await pool.query(
            `SELECT p.poll_id as id, p.title, p.duration_minutes as "durationMinutes",
                    p.invitation_rules as "invitationRules", p.status,
                    p.final_event_id as "finalEventId",
                    p.created_at as "createdAt",
                    u.name as "creatorName", u.email as "creatorEmail",
                    p.creator_user_id as "creatorUserId"
             FROM scheduling_polls p
             LEFT JOIN users u ON p.creator_user_id = u.user_id
             WHERE p.poll_id = $1`,
            [id]
        );

        if (pollResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sondaggio non trovato' });
        }

        const poll = pollResult.rows[0];

        // Recupera gli slot temporali
        const slotsResult = await pool.query(
            `SELECT slot_id as id, poll_id as "pollId",
                    start_time as "startTime", end_time as "endTime",
                    created_at as "createdAt"
             FROM poll_time_slots
             WHERE poll_id = $1
             ORDER BY start_time ASC`,
            [id]
        );

        // Recupera i voti per ogni slot
        const votesResult = await pool.query(
            `SELECT v.vote_id as id, v.slot_id as "slotId", v.user_id as "userId",
                    u.name as "userName", u.email as "userEmail"
             FROM poll_votes v
             JOIN users u ON v.user_id = u.user_id
             WHERE v.slot_id IN (
                 SELECT slot_id FROM poll_time_slots WHERE poll_id = $1
             )
             ORDER BY v.slot_id, u.name`,
            [id]
        );

        // Organizza i voti per slot
        const votesBySlot = {};
        votesResult.rows.forEach(vote => {
            if (!votesBySlot[vote.slotId]) {
                votesBySlot[vote.slotId] = [];
            }
            votesBySlot[vote.slotId].push({
                id: vote.id,
                userId: vote.userId,
                userName: vote.userName,
                userEmail: vote.userEmail
            });
        });

        // Aggiungi i voti agli slot
        const slots = slotsResult.rows.map(slot => ({
            ...slot,
            votes: votesBySlot[slot.id] || []
        }));

        res.json({ ...poll, slots });
    } catch (error) {
        console.error('Errore recupero sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/polls - Crea nuovo sondaggio
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { title, durationMinutes, invitationRules, timeSlots } = req.body;

        if (!title || !durationMinutes || !invitationRules || !timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Titolo, durata, regole di invito e almeno uno slot temporale sono obbligatori' 
            });
        }

        // Verifica permessi: solo Manager, CDA, Admin, Responsabile, Presidente
        const canCreatePoll = 
            req.user.role === 'Manager' ||
            req.user.role === 'CDA' ||
            req.user.role === 'Admin' ||
            req.user.role === 'Responsabile' ||
            req.user.role === 'Presidente';

        if (!canCreatePoll) {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
                error: 'Non hai i permessi per creare sondaggi' 
            });
        }

        // Crea il sondaggio
        const pollResult = await client.query(
            `INSERT INTO scheduling_polls (title, duration_minutes, invitation_rules, creator_user_id)
             VALUES ($1, $2, $3, $4)
             RETURNING poll_id as id, title, duration_minutes as "durationMinutes",
                       invitation_rules as "invitationRules", status,
                       created_at as "createdAt"`,
            [title, durationMinutes, JSON.stringify(invitationRules), req.user.userId]
        );

        const poll = pollResult.rows[0];

        // Crea gli slot temporali
        const slotValues = timeSlots.map((slot, index) => {
            const baseIndex = index * 3;
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
        }).join(', ');

        const slotParams = timeSlots.flatMap(slot => [poll.id, slot.startTime, slot.endTime]);

        await client.query(
            `INSERT INTO poll_time_slots (poll_id, start_time, end_time)
             VALUES ${slotValues}`,
            slotParams
        );

        await client.query('COMMIT');

        // Recupera il sondaggio completo con slot
        const fullPollResult = await pool.query(
            `SELECT p.poll_id as id, p.title, p.duration_minutes as "durationMinutes",
                    p.invitation_rules as "invitationRules", p.status,
                    p.created_at as "createdAt",
                    u.name as "creatorName", u.email as "creatorEmail",
                    p.creator_user_id as "creatorUserId"
             FROM scheduling_polls p
             LEFT JOIN users u ON p.creator_user_id = u.user_id
             WHERE p.poll_id = $1`,
            [poll.id]
        );

        const slotsResult = await pool.query(
            `SELECT slot_id as id, poll_id as "pollId",
                    start_time as "startTime", end_time as "endTime"
             FROM poll_time_slots
             WHERE poll_id = $1
             ORDER BY start_time ASC`,
            [poll.id]
        );

        res.status(201).json({ 
            ...fullPollResult.rows[0], 
            slots: slotsResult.rows 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore creazione sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server', details: error.message });
    } finally {
        client.release();
    }
});

// POST /api/polls/:id/vote - Vota per gli slot
router.post('/:id/vote', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { slotIds } = req.body;

        if (!slotIds || !Array.isArray(slotIds)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'slotIds deve essere un array' });
        }

        // Verifica che il sondaggio esista e sia aperto
        const pollCheck = await pool.query(
            'SELECT status FROM scheduling_polls WHERE poll_id = $1',
            [id]
        );

        if (pollCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sondaggio non trovato' });
        }

        if (pollCheck.rows[0].status !== 'open') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Il sondaggio è chiuso' });
        }

        // Verifica che gli slot appartengano al sondaggio
        if (slotIds.length > 0) {
            const slotsCheck = await pool.query(
                `SELECT slot_id FROM poll_time_slots 
                 WHERE slot_id = ANY($1::uuid[]) AND poll_id = $2`,
                [slotIds, id]
            );

            if (slotsCheck.rows.length !== slotIds.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Uno o più slot non appartengono a questo sondaggio' });
            }
        }

        // Rimuovi i voti esistenti dell'utente per questo sondaggio
        await client.query(
            `DELETE FROM poll_votes 
             WHERE user_id = $1 AND slot_id IN (
                 SELECT slot_id FROM poll_time_slots WHERE poll_id = $2
             )`,
            [req.user.userId, id]
        );

        // Aggiungi i nuovi voti
        if (slotIds.length > 0) {
            const voteValues = slotIds.map((slotId, index) => {
                return `($${index * 2 + 1}, $${index * 2 + 2})`;
            }).join(', ');

            const voteParams = slotIds.flatMap(slotId => [slotId, req.user.userId]);

            await client.query(
                `INSERT INTO poll_votes (slot_id, user_id)
                 VALUES ${voteValues}`,
                voteParams
            );
        }

        await client.query('COMMIT');

        res.json({ 
            message: 'Voto registrato con successo',
            votedSlots: slotIds.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore voto sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    } finally {
        client.release();
    }
});

// POST /api/polls/:id/organize - Organizza evento finale dal sondaggio
router.post('/:id/organize', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { 
            title, description, eventType, eventSubtype, area, clientId,
            callLink, invitationRules, slotId 
        } = req.body;

        if (!title || !slotId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Titolo e slotId sono obbligatori' });
        }

        // Verifica che il sondaggio esista e sia aperto
        const pollResult = await client.query(
            `SELECT poll_id, title, duration_minutes, status, creator_user_id
             FROM scheduling_polls WHERE poll_id = $1`,
            [id]
        );

        if (pollResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sondaggio non trovato' });
        }

        const poll = pollResult.rows[0];

        if (poll.status !== 'open') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Il sondaggio è già chiuso' });
        }

        // Verifica permessi: solo il creatore del sondaggio
        if (poll.creator_user_id !== req.user.userId && req.user.role !== 'Admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Non hai i permessi per organizzare questo sondaggio' });
        }

        // Recupera lo slot selezionato
        const slotResult = await client.query(
            `SELECT slot_id, start_time, end_time
             FROM poll_time_slots
             WHERE slot_id = $1 AND poll_id = $2`,
            [slotId, id]
        );

        if (slotResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Slot non trovato' });
        }

        const slot = slotResult.rows[0];

        // Recupera i voti per questo slot (questi sono gli invitati)
        const votesResult = await client.query(
            `SELECT user_id FROM poll_votes WHERE slot_id = $1`,
            [slotId]
        );

        const participantIds = votesResult.rows.map(row => row.user_id);

        // Crea l'evento (usa la stessa logica di events.js)
        const eventResult = await client.query(
            `INSERT INTO events (
                title, description, start_time, end_time,
                event_type, event_subtype, area, client_id,
                invitation_rules, is_call, call_link, creator_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING event_id as id, title, description,
                      start_time as "startTime", end_time as "endTime",
                      event_type as "eventType", event_subtype as "eventSubtype",
                      area, client_id as "clientId",
                      is_call as "isCall", call_link as "callLink",
                      creator_id as "creatorId", version,
                      created_at as "createdAt"`,
            [
                title, description || null, slot.start_time, slot.end_time,
                eventType || 'generic', eventSubtype || null, area || null, clientId || null,
                invitationRules ? JSON.stringify(invitationRules) : null,
                eventType === 'call' || false, callLink || null, req.user.userId
            ]
        );

        const event = eventResult.rows[0];

        // Crea i partecipanti (solo quelli che hanno votato per questo slot)
        if (participantIds.length > 0) {
            const participantValues = participantIds.map((userId, index) => {
                const baseIndex = index * 2;
                return `($${baseIndex + 1}, $${baseIndex + 2}, 'pending')`;
            }).join(', ');

            const participantParams = participantIds.flatMap(userId => [event.id, userId]);

            await client.query(
                `INSERT INTO participants (event_id, user_id, status)
                 VALUES ${participantValues}`,
                participantParams
            );
        }

        // Chiudi il sondaggio e collega l'evento
        await client.query(
            `UPDATE scheduling_polls
             SET status = 'closed', final_event_id = $1
             WHERE poll_id = $2`,
            [event.id, id]
        );

        await client.query('COMMIT');

        // Recupera l'evento completo con partecipanti
        const participantsResult = await pool.query(
            `SELECT p.participant_id as id, p.status,
                    u.user_id as "userId", u.name as "userName", u.email as "userEmail"
             FROM participants p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.event_id = $1`,
            [event.id]
        );

        res.status(201).json({ 
            ...event, 
            participants: participantsResult.rows,
            message: 'Evento creato con successo dal sondaggio'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore organizzazione evento da sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server', details: error.message });
    } finally {
        client.release();
    }
});

export default router;


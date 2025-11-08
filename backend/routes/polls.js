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
                   p.candidate_id as "candidateId",
                   p.created_at as "createdAt",
                   p.poll_type as "pollType",
                   u.name as "creatorName", u.email as "creatorEmail",
                   p.creator_user_id as "creatorUserId",
                   c.name as "candidateName", c.email as "candidateEmail"
            FROM scheduling_polls p
            LEFT JOIN users u ON p.creator_user_id = u.user_id
            LEFT JOIN candidates c ON p.candidate_id = c.candidate_id
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

        const pollResult = await pool.query(
            `SELECT p.poll_id as id, p.title, p.duration_minutes as "durationMinutes",
                    p.invitation_rules as "invitationRules", p.status,
                    p.final_event_id as "finalEventId",
                    p.candidate_id as "candidateId",
                    p.created_at as "createdAt",
                    p.poll_type as "pollType",
                    u.name as "creatorName", u.email as "creatorEmail",
                    p.creator_user_id as "creatorUserId",
                    c.name as "candidateName", c.email as "candidateEmail"
             FROM scheduling_polls p
             LEFT JOIN users u ON p.creator_user_id = u.user_id
             LEFT JOIN candidates c ON p.candidate_id = c.candidate_id
             WHERE p.poll_id = $1`,
            [id]
        );

        if (pollResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sondaggio non trovato' });
        }

        const poll = pollResult.rows[0];

        if (poll.pollType === 'fixed_slots') {
            const slotsResult = await pool.query(
                `SELECT slot_id as id, poll_id as "pollId",
                        start_time as "startTime", end_time as "endTime",
                        created_at as "createdAt"
                 FROM poll_time_slots
                 WHERE poll_id = $1
                 ORDER BY start_time ASC`,
                [id]
            );

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

            const slots = slotsResult.rows.map(slot => ({
                ...slot,
                votes: votesBySlot[slot.id] || []
            }));

            return res.json({ ...poll, slots });
        }

        const myAvailabilityResult = await pool.query(
            `SELECT slot_start_time
             FROM open_availability_votes
             WHERE poll_id = $1 AND user_id = $2
             ORDER BY slot_start_time ASC`,
            [id, req.user.userId]
        );

        const availabilitySummaryResult = await pool.query(
            `SELECT slot_start_time as "slotStartTime",
                    COUNT(*)::int as "count"
             FROM open_availability_votes
             WHERE poll_id = $1
             GROUP BY slot_start_time
             ORDER BY slot_start_time ASC`,
            [id]
        );

        return res.json({
            ...poll,
            slots: [],
            myAvailabilitySlots: myAvailabilityResult.rows.map(row => row.slot_start_time),
            availabilitySummary: availabilitySummaryResult.rows,
        });
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

        const { title, durationMinutes, invitationRules, timeSlots, candidateId, pollType } = req.body;
        const normalizedPollType = pollType === 'open_availability' ? 'open_availability' : 'fixed_slots';

        if (!title || !durationMinutes || !invitationRules) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Titolo, durata e regole di invito sono obbligatori'
            });
        }

        if (normalizedPollType === 'fixed_slots') {
            if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Per i sondaggi a slot fissi è necessario fornire almeno uno slot temporale'
                });
            }
        }

        if (candidateId) {
            const candidateCheck = await client.query(
                'SELECT candidate_id FROM candidates WHERE candidate_id = $1',
                [candidateId]
            );
            if (candidateCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Candidato non trovato' });
            }
        }

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

        const pollResult = await client.query(
            `INSERT INTO scheduling_polls (title, duration_minutes, invitation_rules, creator_user_id, candidate_id, poll_type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING poll_id as id, title, duration_minutes as "durationMinutes",
                       invitation_rules as "invitationRules", status,
                       candidate_id as "candidateId",
                       poll_type as "pollType",
                       created_at as "createdAt"`,
            [title, durationMinutes, JSON.stringify(invitationRules), req.user.userId, candidateId || null, normalizedPollType]
        );

        const poll = pollResult.rows[0];

        if (normalizedPollType === 'fixed_slots') {
            const safeTimeSlots = Array.isArray(timeSlots) ? timeSlots : [];
            if (safeTimeSlots.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Per i sondaggi a slot fissi è necessario almeno uno slot'
                });
            }

            const slotValues = safeTimeSlots.map((slot, index) => {
                const baseIndex = index * 3;
                return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
            }).join(', ');

            const slotParams = safeTimeSlots.flatMap(slot => [poll.id, slot.startTime, slot.endTime]);

            await client.query(
                `INSERT INTO poll_time_slots (poll_id, start_time, end_time)
                 VALUES ${slotValues}`,
                slotParams
            );
        }

        await client.query('COMMIT');

        const fullPollResult = await pool.query(
            `SELECT p.poll_id as id, p.title, p.duration_minutes as "durationMinutes",
                    p.invitation_rules as "invitationRules", p.status,
                    p.candidate_id as "candidateId",
                    p.poll_type as "pollType",
                    p.created_at as "createdAt",
                    u.name as "creatorName", u.email as "creatorEmail",
                    p.creator_user_id as "creatorUserId",
                    c.name as "candidateName", c.email as "candidateEmail"
             FROM scheduling_polls p
             LEFT JOIN users u ON p.creator_user_id = u.user_id
             LEFT JOIN candidates c ON p.candidate_id = c.candidate_id
             WHERE p.poll_id = $1`,
            [poll.id]
        );

        const responsePayload = fullPollResult.rows[0];

        if (normalizedPollType === 'fixed_slots') {
            const slotsResult = await pool.query(
                `SELECT slot_id as id, poll_id as "pollId",
                        start_time as "startTime", end_time as "endTime"
                 FROM poll_time_slots
                 WHERE poll_id = $1
                 ORDER BY start_time ASC`,
                [poll.id]
            );

            return res.status(201).json({
                ...responsePayload,
                slots: slotsResult.rows
            });
        }

        return res.status(201).json({
            ...responsePayload,
            slots: [],
            myAvailabilitySlots: [],
            availabilitySummary: [],
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
            'SELECT status, poll_type FROM scheduling_polls WHERE poll_id = $1',
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

        if (pollCheck.rows[0].poll_type !== 'fixed_slots') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Questo sondaggio non utilizza la votazione a slot fissi' });
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
            callLink, invitationRules, slotId, slotStartTime
        } = req.body;

        if (!title) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Titolo è obbligatorio' });
        }

        const pollResult = await client.query(
            `SELECT p.poll_id, p.title, p.duration_minutes, p.status, p.creator_user_id, p.candidate_id,
                    p.poll_type,
                    c.email as candidate_email, c.name as candidate_name
             FROM scheduling_polls p
             LEFT JOIN candidates c ON p.candidate_id = c.candidate_id
             WHERE p.poll_id = $1`,
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

        if (poll.creator_user_id !== req.user.userId && req.user.role !== 'Admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Non hai i permessi per organizzare questo sondaggio' });
        }

        let eventStartTime: string;
        let eventEndTime: string;
        let participantIds: string[] = [];

        if (poll.poll_type === 'fixed_slots') {
            if (!slotId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'slotId è obbligatorio per i sondaggi a slot fissi' });
            }

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
            eventStartTime = slot.start_time;
            eventEndTime = slot.end_time;

            const votesResult = await client.query(
                `SELECT user_id FROM poll_votes WHERE slot_id = $1`,
                [slotId]
            );

            participantIds = votesResult.rows.map(row => row.user_id);
        } else {
            if (!slotStartTime) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'slotStartTime è obbligatorio per la modalità heatmap' });
            }

            const parsedSlot = new Date(slotStartTime);
            if (Number.isNaN(parsedSlot.getTime())) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'slotStartTime non valido' });
            }

            const normalizedStart = parsedSlot.toISOString();

            const availabilityResult = await client.query(
                `SELECT user_id
                 FROM open_availability_votes
                 WHERE poll_id = $1 AND slot_start_time = $2`,
                [id, normalizedStart]
            );

            if (availabilityResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Nessuna disponibilità registrata per lo slot selezionato' });
            }

            participantIds = availabilityResult.rows.map(row => row.user_id);

            const endDate = new Date(parsedSlot.getTime() + poll.duration_minutes * 60000);
            eventStartTime = normalizedStart;
            eventEndTime = endDate.toISOString();
        }

        const finalEventType = poll.candidate_id ? 'colloquio' : (eventType || 'generic');

        const eventResult = await client.query(
            `INSERT INTO events (
                title, description, start_time, end_time,
                event_type, event_subtype, area, client_id, candidate_id,
                invitation_rules, recurrence_type, recurrence_end_date,
                is_call, call_link, creator_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING event_id as id, title, description,
                      start_time as "startTime", end_time as "endTime",
                      event_type as "eventType", event_subtype as "eventSubtype",
                      area, client_id as "clientId", candidate_id as "candidateId",
                      recurrence_type as "recurrenceType",
                      recurrence_end_date as "recurrenceEndDate",
                      is_call as "isCall", call_link as "callLink",
                      creator_id as "creatorId", version,
                      created_at as "createdAt"`,
            [
                title || poll.title,
                description || '',
                eventStartTime,
                eventEndTime,
                finalEventType,
                eventSubtype || null,
                area || null,
                clientId || null,
                poll.candidate_id || null,
                invitationRules ? JSON.stringify(invitationRules) : poll.invitation_rules,
                'none',
                null,
                finalEventType === 'call',
                callLink || null,
                req.user.userId
            ]
        );

        const event = eventResult.rows[0];

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

        await client.query(
            `UPDATE scheduling_polls
             SET status = 'closed', final_event_id = $1
             WHERE poll_id = $2`,
            [event.id, id]
        );

        await client.query('COMMIT');

        if (poll.candidate_id && poll.candidate_email) {
            try {
                console.log(`📧 [PLACEHOLDER] Email da inviare a ${poll.candidate_email} per colloquio il ${eventStartTime}`);
                console.log(`   Evento: ${eventResult.rows[0].title}`);
                console.log(`   Dettagli: ${description || 'Nessuna descrizione'}`);
            } catch (emailError) {
                console.error('Errore invio email candidato:', emailError);
            }
        }

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
            message: 'Evento creato con successo dal sondaggio',
            candidateNotified: !!poll.candidate_id
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore organizzazione evento da sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server', details: error.message });
    } finally {
        client.release();
    }
});

// POST /api/polls/:id/availability - Registra disponibilità granulari (modalità heatmap)
router.post('/:id/availability', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { slots } = req.body;

        if (!Array.isArray(slots)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'slots deve essere un array' });
        }

        const pollCheck = await pool.query(
            'SELECT status, poll_type, duration_minutes FROM scheduling_polls WHERE poll_id = $1',
            [id]
        );

        if (pollCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sondaggio non trovato' });
        }

        const pollRow = pollCheck.rows[0];

        if (pollRow.status !== 'open') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Il sondaggio è chiuso' });
        }

        if (pollRow.poll_type !== 'open_availability') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Questo sondaggio non supporta la modalità heatmap' });
        }

        await client.query(
            `DELETE FROM open_availability_votes
             WHERE poll_id = $1 AND user_id = $2`,
            [id, req.user.userId]
        );

        const uniqueSlots = Array.from(new Set(slots));
        let inserted = 0;

        if (uniqueSlots.length > 0) {
            const parsedSlots = uniqueSlots
                .map(slot => {
                    const date = new Date(slot);
                    if (Number.isNaN(date.getTime())) {
                        return null;
                    }
                    return date.toISOString();
                })
                .filter(Boolean);

            if (parsedSlots.length !== uniqueSlots.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Formato slot non valido' });
            }

            const values = parsedSlots
                .map((_, index) => {
                    const base = index * 2;
                    return `($1, $${base + 2}, $${base + 3})`;
                })
                .join(', ');

            const params = [id];
            parsedSlots.forEach(slot => {
                params.push(slot);
                params.push(req.user.userId);
            });

            await client.query(
                `INSERT INTO open_availability_votes (poll_id, slot_start_time, user_id)
                 VALUES ${values}`,
                params
            );
            inserted = parsedSlots.length;
        }

        await client.query('COMMIT');

        res.json({
            message: 'Disponibilità registrata',
            saved: inserted
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore availability sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    } finally {
        client.release();
    }
});

// GET /api/polls/:id/heatmap - Aggregazione disponibilità per heatmap
router.get('/:id/heatmap', async (req, res) => {
    try {
        const { id } = req.params;

        const pollResult = await pool.query(
            `SELECT poll_id, creator_user_id, poll_type, duration_minutes
             FROM scheduling_polls
             WHERE poll_id = $1`,
            [id]
        );

        if (pollResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sondaggio non trovato' });
        }

        const poll = pollResult.rows[0];

        if (poll.poll_type !== 'open_availability') {
            return res.status(400).json({ error: 'Questo sondaggio non utilizza la modalità heatmap' });
        }

        const isOwnerOrAdmin = poll.creator_user_id === req.user.userId || req.user.role === 'Admin';
        if (!isOwnerOrAdmin) {
            return res.status(403).json({ error: 'Non hai i permessi per visualizzare questa heatmap' });
        }

        const heatmapResult = await pool.query(
            `SELECT v.slot_start_time as "slotStartTime",
                    COUNT(*)::int as "availableUsers",
                    json_agg(
                        json_build_object(
                            'userId', u.user_id,
                            'userName', u.name,
                            'userEmail', u.email
                        ) ORDER BY u.name
                    ) as users
             FROM open_availability_votes v
             JOIN users u ON v.user_id = u.user_id
             WHERE v.poll_id = $1
             GROUP BY v.slot_start_time
             ORDER BY v.slot_start_time ASC`,
            [id]
        );

        res.json({
            pollId: id,
            durationMinutes: poll.duration_minutes,
            slots: heatmapResult.rows,
        });
    } catch (error) {
        console.error('Errore heatmap sondaggio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;



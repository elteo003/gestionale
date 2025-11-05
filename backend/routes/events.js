import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * Espande le regole di invito in un array di user_id unici
 * @param {Object} rules - Regole di invito: { groups: [], individuals: [], area: '' }
 * @returns {Promise<string[]>} Array di user_id da invitare
 */
async function expandInvites(rules) {
    if (!rules) return [];
    
    const userIds = new Set();
    
    // Espandi gruppi
    if (rules.groups && Array.isArray(rules.groups)) {
        for (const group of rules.groups) {
            let query = '';
            const params = [];
            
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
                const result = await pool.query(query, params);
                result.rows.forEach(row => userIds.add(row.user_id));
            }
        }
    }
    
    // Aggiungi individui specifici
    if (rules.individuals && Array.isArray(rules.individuals)) {
        rules.individuals.forEach(userId => {
            if (userId) userIds.add(userId);
        });
    }
    
    // Espandi per area se specificata
    if (rules.area) {
        const areaResult = await pool.query(
            `SELECT user_id FROM users WHERE area = $1 AND is_active = TRUE`,
            [rules.area]
        );
        areaResult.rows.forEach(row => userIds.add(row.user_id));
    }
    
    return Array.from(userIds);
}

/**
 * Genera eventi ricorrenti basati su recurrence_type e recurrence_end_date
 * @param {Date} startDate - Data di inizio originale
 * @param {Date} endDate - Data di fine originale
 * @param {string} recurrenceType - 'none', 'weekly', 'monthly'
 * @param {Date} recurrenceEndDate - Data di fine ricorrenza
 * @returns {Array<{startTime: Date, endTime: Date}>} Array di date per eventi ricorrenti
 */
function generateRecurrenceDates(startDate, endDate, recurrenceType, recurrenceEndDate) {
    if (recurrenceType === 'none' || !recurrenceEndDate) {
        return [{ startTime: startDate, endTime: endDate }];
    }
    
    const dates = [];
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    const endRecurrence = new Date(recurrenceEndDate);
    
    // Calcola la durata dell'evento
    const duration = currentEnd.getTime() - currentStart.getTime();
    
    while (currentStart <= endRecurrence) {
        dates.push({
            startTime: new Date(currentStart),
            endTime: new Date(currentStart.getTime() + duration)
        });
        
        if (recurrenceType === 'weekly') {
            currentStart.setDate(currentStart.getDate() + 7);
            currentEnd.setDate(currentEnd.getDate() + 7);
        } else if (recurrenceType === 'monthly') {
            currentStart.setMonth(currentStart.getMonth() + 1);
            currentEnd.setMonth(currentEnd.getMonth() + 1);
        } else {
            break;
        }
    }
    
    return dates;
}

// GET /api/events - Lista tutti gli eventi (con filtri opzionali)
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, isCall } = req.query;

        let query = `
            SELECT e.event_id as id, e.title, e.description, 
                   e.start_time as "startTime", e.end_time as "endTime",
                   e.is_call as "isCall", e.call_link as "callLink",
                   e.event_type as "eventType", e.event_subtype as "eventSubtype",
                   e.area, e.client_id as "clientId",
                   e.recurrence_type as "recurrenceType",
                   e.recurrence_end_date as "recurrenceEndDate",
                   e.creator_id as "creatorId",
                   e.version,
                   u.name as "creatorName", e.created_at as "createdAt",
                   c.name as "clientName"
            FROM events e
            LEFT JOIN users u ON e.creator_id = u.user_id
            LEFT JOIN clients c ON e.client_id = c.client_id
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
                    e.event_type as "eventType", e.event_subtype as "eventSubtype",
                    e.area, e.client_id as "clientId",
                    e.recurrence_type as "recurrenceType",
                    e.recurrence_end_date as "recurrenceEndDate",
                    e.creator_id as "creatorId",
                    e.version,
                    u.name as "creatorName", e.created_at as "createdAt",
                    c.name as "clientName"
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.user_id
             LEFT JOIN clients c ON e.client_id = c.client_id
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

// POST /api/events - Crea nuovo evento (con supporto per tipi, regole di invito e ricorrenza)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { 
            title, description, startTime, endTime, 
            eventType, eventSubtype, area, clientId,
            invitationRules, recurrenceType, recurrenceEndDate,
            isCall, callLink,
            // Campi specifici per formazione
            trainerName, prerequisites, level,
            // Campi specifici per networking
            location, externalLink
        } = req.body;

        if (!title || !startTime || !endTime) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Titolo, data inizio e fine sono obbligatori' });
        }

        if (new Date(endTime) <= new Date(startTime)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La data di fine deve essere successiva alla data di inizio' });
        }

        // Controlli di sicurezza per call_reparto
        if (eventSubtype === 'call_reparto' && area) {
            if (area !== req.user.area && req.user.role !== 'Presidente' && req.user.role !== 'Admin') {
                await client.query('ROLLBACK');
                return res.status(403).json({ 
                    error: 'Non autorizzato a creare call per altri reparti' 
                });
            }
        }

        // Determina event_type se non specificato (backward compatibility)
        const finalEventType = eventType || (isCall ? 'call' : 'generic');
        
        // Determina is_call per backward compatibility
        const finalIsCall = isCall !== undefined ? isCall : (finalEventType === 'call');

        // Genera date per ricorrenza
        const recurrenceDates = generateRecurrenceDates(
            new Date(startTime),
            new Date(endTime),
            recurrenceType || 'none',
            recurrenceEndDate ? new Date(recurrenceEndDate) : null
        );

        const createdEvents = [];

        // Crea ogni evento (singolo o ricorrente)
        for (const datePair of recurrenceDates) {
            // Prepara description con campi aggiuntivi per formazione e networking
            let finalDescription = description || '';
            
            if (finalEventType === 'formazione') {
                const trainingInfo = [];
                if (trainerName) trainingInfo.push(`Relatore: ${trainerName}`);
                if (level) trainingInfo.push(`Livello: ${level}`);
                if (prerequisites) trainingInfo.push(`Prerequisiti: ${prerequisites}`);
                if (trainingInfo.length > 0) {
                    finalDescription = finalDescription 
                        ? `${finalDescription}\n\n${trainingInfo.join('\n')}`
                        : trainingInfo.join('\n');
                }
            }
            
            if (finalEventType === 'networking') {
                const networkingInfo = [];
                if (location) networkingInfo.push(`Location: ${location}`);
                if (externalLink) networkingInfo.push(`Link: ${externalLink}`);
                if (networkingInfo.length > 0) {
                    finalDescription = finalDescription 
                        ? `${finalDescription}\n\n${networkingInfo.join('\n')}`
                        : networkingInfo.join('\n');
                }
            }

            // Inserisci evento
            const eventResult = await client.query(
                `INSERT INTO events (
                    title, description, start_time, end_time, 
                    event_type, event_subtype, area, client_id,
                    invitation_rules, recurrence_type, recurrence_end_date,
                    is_call, call_link, creator_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING event_id as id, title, description, 
                          start_time as "startTime", end_time as "endTime",
                          event_type as "eventType", event_subtype as "eventSubtype",
                          area, client_id as "clientId",
                          recurrence_type as "recurrenceType",
                          recurrence_end_date as "recurrenceEndDate",
                          is_call as "isCall", call_link as "callLink",
                          creator_id as "creatorId", version,
                          created_at as "createdAt"`,
                [
                    title, finalDescription, datePair.startTime, datePair.endTime,
                    finalEventType, eventSubtype || null, area || null, clientId || null,
                    invitationRules ? JSON.stringify(invitationRules) : null,
                    recurrenceType || 'none',
                    recurrenceEndDate || null,
                    finalIsCall, callLink || null, req.user.userId
                ]
            );

            const event = eventResult.rows[0];

            // Espandi regole di invito e crea partecipanti
            let userIdsToInvite = [];
            
            if (invitationRules) {
                userIdsToInvite = await expandInvites(invitationRules);
            } else if (req.body.participantIds && Array.isArray(req.body.participantIds)) {
                // Backward compatibility: se viene passato participantIds direttamente
                userIdsToInvite = req.body.participantIds;
            }

            // Crea partecipanti per questo evento
            if (userIdsToInvite.length > 0) {
                const participantValues = userIdsToInvite.map((userId, index) => {
                    const baseIndex = index * 2;
                    return `($${baseIndex + 1}, $${baseIndex + 2}, 'pending')`;
                }).join(', ');

                const participantParams = userIdsToInvite.flatMap(userId => [event.id, userId]);

                await client.query(
                    `INSERT INTO participants (event_id, user_id, status)
                     VALUES ${participantValues}`,
                    participantParams
                );
            }

            // Recupera i partecipanti creati
            const participantsResult = await client.query(
                `SELECT p.participant_id as id, p.status,
                        u.user_id as "userId", u.name as "userName", u.email as "userEmail"
                 FROM participants p
                 JOIN users u ON p.user_id = u.user_id
                 WHERE p.event_id = $1`,
                [event.id]
            );

            createdEvents.push({ ...event, participants: participantsResult.rows });
        }

        await client.query('COMMIT');
        
        // Se è un evento ricorrente, restituisci tutti gli eventi creati
        // Altrimenti restituisci solo il primo (singolo evento)
        if (createdEvents.length > 1) {
            res.status(201).json({ 
                message: `${createdEvents.length} eventi creati con successo`,
                events: createdEvents 
            });
        } else {
            res.status(201).json(createdEvents[0]);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Errore creazione evento:', error);
        res.status(500).json({ error: 'Errore interno del server', details: error.message });
    } finally {
        client.release();
    }
});

// PUT /api/events/:id - Aggiorna evento con optimistic locking
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, description, startTime, endTime, 
            eventType, eventSubtype, area, clientId,
            isCall, callLink, expectedVersion 
        } = req.body;

        // Verifica che l'utente sia il creatore dell'evento
        const checkResult = await pool.query(
            'SELECT creator_id, version FROM events WHERE event_id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato' });
        }

        if (checkResult.rows[0].creator_id !== req.user.userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Non hai i permessi per modificare questo evento' });
        }

        // Se expectedVersion è fornito, verifica che corrisponda
        if (expectedVersion !== undefined) {
            const currentVersion = checkResult.rows[0].version;
            if (currentVersion !== expectedVersion) {
                // Versione non corrisponde - conflitto di modifica
                // Recupera i dati attuali del server per il merge
                const serverData = await pool.query(
                    `SELECT e.event_id as id, e.title, e.description, 
                            e.start_time as "startTime", e.end_time as "endTime",
                            e.is_call as "isCall", e.call_link as "callLink",
                            e.event_type as "eventType", e.event_subtype as "eventSubtype",
                            e.area, e.client_id as "clientId",
                            e.recurrence_type as "recurrenceType",
                            e.recurrence_end_date as "recurrenceEndDate",
                            e.version
                     FROM events e
                     WHERE e.event_id = $1`,
                    [id]
                );

                return res.status(409).json({
                    error: 'CONCURRENT_MODIFICATION',
                    message: 'L\'evento è stato modificato da un altro utente. Ricarica i dati per vedere le modifiche.',
                    currentVersion: currentVersion,
                    expectedVersion: expectedVersion,
                    serverData: serverData.rows[0]
                });
            }
        }

        // Aggiorna l'evento (il trigger incrementerà automaticamente version)
        const result = await pool.query(
            `UPDATE events
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 start_time = COALESCE($3, start_time),
                 end_time = COALESCE($4, end_time),
                 is_call = COALESCE($5, is_call),
                 call_link = COALESCE($6, call_link),
                 event_type = COALESCE($7, event_type),
                 event_subtype = COALESCE($8, event_subtype),
                 area = COALESCE($9, area),
                 client_id = COALESCE($10, client_id),
                 updated_at = CURRENT_TIMESTAMP
             WHERE event_id = $11
             RETURNING event_id as id, title, description, 
                       start_time as "startTime", end_time as "endTime",
                       is_call as "isCall", call_link as "callLink",
                       event_type as "eventType", event_subtype as "eventSubtype",
                       area, client_id as "clientId",
                       recurrence_type as "recurrenceType",
                       recurrence_end_date as "recurrenceEndDate",
                       creator_id as "creatorId", version,
                       created_at as "createdAt"`,
            [title, description, startTime, endTime, isCall, callLink, 
             eventType, eventSubtype, area, clientId, id]
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
                    e.event_type as "eventType", e.event_subtype as "eventSubtype",
                    e.area, e.client_id as "clientId",
                    e.recurrence_type as "recurrenceType",
                    e.recurrence_end_date as "recurrenceEndDate",
                    e.creator_id as "creatorId",
                    e.version,
                    u.name as "creatorName", p.status as "myStatus",
                    c.name as "clientName"
             FROM events e
             JOIN participants p ON e.event_id = p.event_id
             LEFT JOIN users u ON e.creator_id = u.user_id
             LEFT JOIN clients c ON e.client_id = c.client_id
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


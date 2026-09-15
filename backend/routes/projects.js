import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireProjectWrite, requireNotSocio } from '../middleware/authorize.js';
import { isSocio, isPrivileged, canAccessProjectInArea } from '../lib/roles.js';
import { isUserAssignedToProject } from '../lib/projectAccess.js';
import { userCanSeeProject } from '../lib/documentAccess.js';
import { attachTodosToProjects } from '../lib/projects.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/projects - Lista progetti (management; i soci usano /my)
router.get('/', requireNotSocio, async (req, res, next) => {
    try {
        const params = [];
        let where = '';

        const result = await pool.query(
            `SELECT p.project_id as id, p.name, p.client_id as "clientId",
                    p.area, p.status, p.created_at as "createdAt", p.version,
                    c.name as "clientName"
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.client_id
             ${where}
             ORDER BY p.created_at DESC`,
            params,
        );

        const projectsWithTodos = await attachTodosToProjects(result.rows);
        res.json(projectsWithTodos);
    } catch (error) {
        next(error);
    }
});

// GET /api/projects/my - Restituisce i progetti assegnati all'utente corrente
router.get('/my', async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Verifica se la tabella project_assignments esiste
        const tableCheck = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'project_assignments'
            )`
        );
        
        if (!tableCheck.rows[0].exists) {
            // La tabella non esiste ancora, probabilmente la migration non è stata eseguita
            return res.json([]);
        }
        
        const result = await pool.query(
            `SELECT p.project_id as id, p.name, p.client_id as "clientId", 
                    p.area, p.status, p.created_at as "createdAt", p.version,
                    c.name as "clientName", pa.created_at as "assignedAt"
             FROM projects p
             JOIN project_assignments pa ON p.project_id = pa.project_id
             LEFT JOIN clients c ON p.client_id = c.client_id
             WHERE pa.user_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero progetti assegnati:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/projects/:id - Dettaglio progetto
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isSocio(req.user.role)) {
            const assigned = await isUserAssignedToProject(req.user.userId, id);
            if (!assigned) {
                return res.status(403).json({ error: 'Progetto non assegnato al tuo profilo' });
            }
        }

        const projectResult = await pool.query(
            `SELECT p.project_id as id, p.name, p.client_id as "clientId", 
                    p.area, p.status, p.created_at as "createdAt", p.version,
                    c.name as "clientName"
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.client_id
             WHERE p.project_id = $1`,
            [id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }

        if (!canAccessProjectInArea(req.user, projectResult.rows[0].area)) {
            return res.status(403).json({ error: 'Accesso negato a questo progetto' });
        }

        const todosResult = await pool.query(
            `SELECT todo_id as id, text, completed, priority, created_at as "createdAt"
             FROM todos
             WHERE project_id = $1
             ORDER BY created_at ASC`,
            [id]
        );

        res.json({ ...projectResult.rows[0], todos: todosResult.rows });
    } catch (error) {
        console.error('Errore recupero progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/projects - Crea nuovo progetto
router.post('/', requireProjectWrite, async (req, res) => {
    try {
        const { name, clientId, area, status } = req.body;

        if (!name || !clientId) {
            return res.status(400).json({ error: 'Nome e cliente sono obbligatori' });
        }

        const result = await pool.query(
            `INSERT INTO projects (name, client_id, area, status, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING project_id as id, name, client_id as "clientId", 
                       area, status, created_at as "createdAt"`,
            [name, clientId, area || null, status || 'Pianificato', req.user.userId]
        );

        res.status(201).json({ ...result.rows[0], todos: [] });
    } catch (error) {
        console.error('Errore creazione progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/projects/:id - Aggiorna progetto con optimistic locking
router.put('/:id', requireProjectWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, clientId, area, status, expectedVersion } = req.body;

        // Se expectedVersion è fornito, verifica che corrisponda
        if (expectedVersion !== undefined) {
            // Prima verifica la versione corrente
            const currentCheck = await pool.query(
                'SELECT version FROM projects WHERE project_id = $1',
                [id]
            );

            if (currentCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Progetto non trovato' });
            }

            const currentVersion = currentCheck.rows[0].version;
            if (currentVersion !== expectedVersion) {
                // Versione non corrisponde - conflitto di modifica
                // Recupera i dati attuali del server per il merge
                const serverData = await pool.query(
                    `SELECT project_id as id, name, client_id as "clientId", 
                            area, status, version, created_at as "createdAt"
                     FROM projects WHERE project_id = $1`,
                    [id]
                );

                return res.status(409).json({
                    error: 'CONCURRENT_MODIFICATION',
                    message: 'Il progetto è stato modificato da un altro utente. Ricarica i dati per vedere le modifiche.',
                    currentVersion: currentVersion,
                    expectedVersion: expectedVersion,
                    serverData: serverData.rows[0]
                });
            }
        }

        const result = await pool.query(
            `UPDATE projects
             SET name = COALESCE($1, name),
                 client_id = COALESCE($2, client_id),
                 area = COALESCE($3, area),
                 status = COALESCE($4, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE project_id = $5
             RETURNING project_id as id, name, client_id as "clientId", 
                       area, status, version, created_at as "createdAt"`,
            [name, clientId, area, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }

        // Recupera i todo
        const todosResult = await pool.query(
            `SELECT todo_id as id, text, completed, priority, created_at as "createdAt"
             FROM todos WHERE project_id = $1 ORDER BY created_at ASC`,
            [id]
        );

        res.json({ ...result.rows[0], todos: todosResult.rows });
    } catch (error) {
        console.error('Errore aggiornamento progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/projects/:id/status - Aggiorna solo lo stato
router.patch('/:id/status', requireProjectWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Stato richiesto' });
        }

        const result = await pool.query(
            `UPDATE projects
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE project_id = $2
             RETURNING project_id as id, name, client_id as "clientId", 
                       area, status, created_at as "createdAt"`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento stato:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/projects/:id - Elimina progetto
router.delete('/:id', requireProjectWrite, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM projects WHERE project_id = $1 RETURNING project_id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }

        res.json({ message: 'Progetto eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// --- TODO Routes ---

// POST /api/projects/:id/todos - Aggiungi todo a progetto
router.post('/:id/todos', requireProjectWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const { text, priority } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Testo del todo è obbligatorio' });
        }

        const result = await pool.query(
            `INSERT INTO todos (project_id, text, priority)
             VALUES ($1, $2, $3)
             RETURNING todo_id as id, text, completed, priority, created_at as "createdAt"`,
            [id, text, priority || 'Media']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione todo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

async function requireTodoUpdateAccess(req, res, next) {
    if (!isSocio(req.user.role)) {
        return requireProjectWrite(req, res, next);
    }
    const assigned = await isUserAssignedToProject(req.user.userId, req.params.projectId);
    if (!assigned) {
        return res.status(403).json({ error: 'Non puoi aggiornare task di questo progetto' });
    }
    next();
}

// PATCH /api/projects/:projectId/todos/:todoId/toggle - Toggle completamento todo
router.patch('/:projectId/todos/:todoId/toggle', requireTodoUpdateAccess, async (req, res) => {
    try {
        const { projectId, todoId } = req.params;

        const result = await pool.query(
            `UPDATE todos
             SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP
             WHERE todo_id = $1 AND project_id = $2
             RETURNING todo_id as id, text, completed, priority, created_at as "createdAt"`,
            [todoId, projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todo non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore toggle todo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/projects/:projectId/todos/:todoId/status - Aggiorna stato del todo
router.patch('/:projectId/todos/:todoId/status', requireTodoUpdateAccess, async (req, res) => {
    try {
        const { projectId, todoId } = req.params;
        const { status, completed } = req.body;

        // Mappa lo status italiano a completed
        let completedValue = completed;
        if (status === 'terminato') {
            completedValue = true;
        } else if (status === 'da fare') {
            completedValue = false;
        }
        // Per "in corso", manteniamo il valore di completed se fornito

        const result = await pool.query(
            `UPDATE todos
             SET completed = $1, updated_at = CURRENT_TIMESTAMP
             WHERE todo_id = $2 AND project_id = $3
             RETURNING todo_id as id, text, completed, priority, created_at as "createdAt"`,
            [completedValue !== undefined ? completedValue : false, todoId, projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todo non trovato' });
        }

        // Aggiungi status al risultato per il frontend
        const todo = result.rows[0];
        todo.status = status || (todo.completed ? 'terminato' : 'da fare');

        res.json(todo);
    } catch (error) {
        console.error('Errore aggiornamento stato todo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/projects/:projectId/todos/:todoId - Elimina todo
router.delete('/:projectId/todos/:todoId', requireProjectWrite, async (req, res) => {
    try {
        const { projectId, todoId } = req.params;

        const result = await pool.query(
            'DELETE FROM todos WHERE todo_id = $1 AND project_id = $2 RETURNING todo_id',
            [todoId, projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todo non trovato' });
        }

        res.json({ message: 'Todo eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione todo:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// --- Team Routes ---

// Middleware per verificare se l'utente può gestire il team del progetto
const canManageTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        // Admin, IT, Responsabile possono gestire tutti i team
        if (userRole === 'Admin' || userRole === 'IT' || userRole === 'Responsabile') {
            return next();
        }
        
        // Verifica se l'utente è manager dell'area del progetto
        const projectResult = await pool.query(
            `SELECT p.area
             FROM projects p
             WHERE p.project_id = $1`,
            [id]
        );
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }
        
        const project = projectResult.rows[0];
        const userResult = await pool.query(
            'SELECT area, role FROM users WHERE user_id = $1',
            [userId]
        );
        const user = userResult.rows[0];
        
        // Se l'utente è manager dell'area del progetto, può gestire il team
        if (user.area === project.area && (user.role === 'IT' || user.role === 'Marketing' || user.role === 'Commerciale')) {
            return next();
        }
        
        res.status(403).json({ error: 'Accesso negato. Solo manager dell\'area possono gestire il team.' });
    } catch (error) {
        console.error('Errore verifica permessi team:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/projects/:id/team - Restituisce gli utenti assegnati al progetto
router.get('/:id/team', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT u.user_id as id, u.name, u.email, u.area, u.role, pa.created_at as "assignedAt"
             FROM project_assignments pa
             JOIN users u ON pa.user_id = u.user_id
             WHERE pa.project_id = $1
             ORDER BY pa.created_at ASC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero team:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/projects/:id/team - Aggiunge un utente al team del progetto
router.post('/:id/team', canManageTeam, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID richiesto' });
        }
        
        // Verifica che l'utente esista
        const userCheck = await pool.query(
            'SELECT user_id, area FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }
        
        // Verifica che il progetto esista e ottieni la sua area
        const projectCheck = await pool.query(
            'SELECT project_id, area FROM projects WHERE project_id = $1',
            [id]
        );
        
        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }
        
        const projectArea = projectCheck.rows[0].area;
        const userArea = userCheck.rows[0].area;
        
        // Verifica che l'utente appartenga alla stessa area del progetto (opzionale, ma raccomandato)
        if (projectArea && userArea && projectArea !== userArea) {
            return res.status(400).json({ error: 'L\'utente deve appartenere alla stessa area del progetto' });
        }
        
        // Verifica se l'utente è già assegnato
        const existingCheck = await pool.query(
            'SELECT assignment_id FROM project_assignments WHERE project_id = $1 AND user_id = $2',
            [id, userId]
        );
        
        if (existingCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Utente già assegnato a questo progetto' });
        }
        
        const result = await pool.query(
            `INSERT INTO project_assignments (project_id, user_id)
             VALUES ($1, $2)
             RETURNING assignment_id as id, project_id as "projectId", user_id as "userId", created_at as "createdAt"`,
            [id, userId]
        );
        
        // Recupera i dati completi dell'utente
        const userResult = await pool.query(
            'SELECT user_id as id, name, email, area, role FROM users WHERE user_id = $1',
            [userId]
        );

        await logProjectActivity(req.user.userId, 'team.added', {
            targetType: 'user',
            targetId: userId,
            projectId: id,
            payload: { target: userResult.rows[0]?.name || 'un membro' },
        });
        
        res.status(201).json({ ...result.rows[0], user: userResult.rows[0] });
    } catch (error) {
        console.error('Errore aggiunta membro team:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Utente già assegnato a questo progetto' });
        }
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/projects/:id/team/:userId - Rimuove un utente dal team
router.delete('/:id/team/:userId', canManageTeam, async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM project_assignments WHERE project_id = $1 AND user_id = $2 RETURNING assignment_id',
            [id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assegnazione non trovata' });
        }
        
        res.json({ message: 'Utente rimosso dal team con successo' });
    } catch (error) {
        console.error('Errore rimozione membro team:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

function parseHttpUrl(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return null;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(withProto);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.href;
    } catch {
        return null;
    }
}

async function logProjectActivity(actorId, type, { targetType, targetId, projectId, payload }) {
    await pool.query(
        `INSERT INTO activities (actor_id, type, target_type, target_id, project_id, payload)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
            actorId,
            type,
            targetType || null,
            targetId || null,
            projectId || null,
            JSON.stringify(payload || {}),
        ],
    );
}

// GET /api/projects/:id/resources
router.get('/:id/resources', async (req, res) => {
    try {
        const { id } = req.params;
        const projectCheck = await pool.query(
            'SELECT project_id, area FROM projects WHERE project_id = $1',
            [id],
        );
        if (!projectCheck.rows.length) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }
        const visible = await userCanSeeProject(
            req.user,
            projectCheck.rows[0].project_id,
            projectCheck.rows[0].area,
        );
        if (!visible) {
            return res.status(403).json({ error: 'Non puoi vedere i documenti di questo progetto' });
        }

        const result = await pool.query(
            `SELECT r.resource_id as id, r.project_id as "projectId", r.title, r.url,
                    r.created_by as "createdBy", r.created_at as "createdAt",
                    u.name as "createdByName"
             FROM project_resources r
             LEFT JOIN users u ON u.user_id = r.created_by
             WHERE r.project_id = $1
             ORDER BY r.created_at DESC`,
            [id],
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero risorse progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/projects/:id/resources
router.post('/:id/resources', requireProjectWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const title = String(req.body?.title || '').trim();
        const url = parseHttpUrl(req.body?.url);

        if (!title) return res.status(400).json({ error: 'Titolo obbligatorio' });
        if (!url) return res.status(400).json({ error: 'URL non valido. Usa un link http o https.' });

        const projectCheck = await pool.query(
            'SELECT project_id, name FROM projects WHERE project_id = $1',
            [id],
        );
        if (!projectCheck.rows.length) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }

        const result = await pool.query(
            `INSERT INTO project_resources (project_id, title, url, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING resource_id as id, project_id as "projectId", title, url,
                       created_by as "createdBy", created_at as "createdAt"`,
            [id, title, url, req.user.userId],
        );

        const row = result.rows[0];
        await logProjectActivity(req.user.userId, 'resource.added', {
            targetType: 'resource',
            targetId: row.id,
            projectId: id,
            payload: {
                fileName: title,
                target: projectCheck.rows[0].name,
                url,
            },
        });

        res.status(201).json({ ...row, createdByName: req.user.name || null });
    } catch (error) {
        console.error('Errore creazione risorsa progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/projects/:id/resources/:resourceId
router.delete('/:id/resources/:resourceId', requireProjectWrite, async (req, res) => {
    try {
        const { id, resourceId } = req.params;
        const result = await pool.query(
            `DELETE FROM project_resources
             WHERE resource_id = $1 AND project_id = $2
             RETURNING resource_id`,
            [resourceId, id],
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Risorsa non trovata' });
        }
        res.json({ message: 'Risorsa rimossa' });
    } catch (error) {
        console.error('Errore rimozione risorsa progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// --- Tasks Routes (Nuova tabella tasks) ---

// GET /api/projects/:id/tasks - Restituisce tutti i task per un progetto
router.get('/:id/tasks', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT t.task_id as id, t.description, t.status, t.priority, 
                    t.assigned_to_user_id as "assignedTo", t.created_at as "createdAt", t.updated_at as "updatedAt",
                    u.name as "assignedToName", u.email as "assignedToEmail"
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to_user_id = u.user_id
             WHERE t.project_id = $1
             ORDER BY 
                 CASE WHEN t.assigned_to_user_id IS NULL THEN 0 ELSE 1 END,
                 CASE t.priority 
                     WHEN 'Alta' THEN 1 
                     WHEN 'Media' THEN 2 
                     WHEN 'Bassa' THEN 3 
                 END,
                 t.created_at ASC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero tasks:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/projects/:id/tasks - Crea un nuovo task per il progetto (non ancora assegnato)
router.post('/:id/tasks', canManageTeam, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, priority } = req.body;
        const userId = req.user.userId;
        
        if (!description) {
            return res.status(400).json({ error: 'Descrizione del task è obbligatoria' });
        }
        
        // Verifica che il progetto esista
        const projectCheck = await pool.query(
            'SELECT project_id FROM projects WHERE project_id = $1',
            [id]
        );
        
        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
        }
        
        const result = await pool.query(
            `INSERT INTO tasks (project_id, description, priority, created_by, assigned_to_user_id)
             VALUES ($1, $2, $3, $4, NULL)
             RETURNING task_id as id, description, status, priority, 
                       assigned_to_user_id as "assignedTo", created_at as "createdAt", updated_at as "updatedAt"`,
            [id, description, priority || 'Media', userId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore creazione task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/projects/:id/tasks/:taskId - Elimina un task
router.delete('/:id/tasks/:taskId', canManageTeam, async (req, res) => {
    try {
        const { id, taskId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM tasks WHERE task_id = $1 AND project_id = $2 RETURNING task_id',
            [taskId, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task non trovato' });
        }
        
        res.json({ message: 'Task eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


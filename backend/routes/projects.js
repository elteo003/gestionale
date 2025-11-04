import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/projects - Lista tutti i progetti
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.project_id as id, p.name, p.client_id as "clientId", 
                    p.area, p.status, p.created_at as "createdAt",
                    c.name as "clientName"
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.client_id
             ORDER BY p.created_at DESC`
        );

        // Recupera i todo per ogni progetto
        const projectsWithTodos = await Promise.all(
            result.rows.map(async (project) => {
                const todosResult = await pool.query(
                    `SELECT todo_id as id, text, completed, priority, created_at as "createdAt"
                     FROM todos
                     WHERE project_id = $1
                     ORDER BY created_at ASC`,
                    [project.id]
                );
                return { ...project, todos: todosResult.rows };
            })
        );

        res.json(projectsWithTodos);
    } catch (error) {
        console.error('Errore recupero progetti:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/projects/:id - Dettaglio progetto
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const projectResult = await pool.query(
            `SELECT p.project_id as id, p.name, p.client_id as "clientId", 
                    p.area, p.status, p.created_at as "createdAt",
                    c.name as "clientName"
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.client_id
             WHERE p.project_id = $1`,
            [id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Progetto non trovato' });
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
router.post('/', async (req, res) => {
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

// PUT /api/projects/:id - Aggiorna progetto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, clientId, area, status } = req.body;

        const result = await pool.query(
            `UPDATE projects
             SET name = COALESCE($1, name),
                 client_id = COALESCE($2, client_id),
                 area = COALESCE($3, area),
                 status = COALESCE($4, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE project_id = $5
             RETURNING project_id as id, name, client_id as "clientId", 
                       area, status, created_at as "createdAt"`,
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
router.patch('/:id/status', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
router.post('/:id/todos', async (req, res) => {
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

// PATCH /api/projects/:projectId/todos/:todoId/toggle - Toggle completamento todo
router.patch('/:projectId/todos/:todoId/toggle', async (req, res) => {
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
router.patch('/:projectId/todos/:todoId/status', async (req, res) => {
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
router.delete('/:projectId/todos/:todoId', async (req, res) => {
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

export default router;


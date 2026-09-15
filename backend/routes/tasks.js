import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { isPrivileged, isSocio } from '../lib/roles.js';
import { canEditTask, canEditProjectTasks } from '../lib/taskAccess.js';
import { notifyTaskAssigned, scheduleNotify } from '../services/notificationService.js';

const router = express.Router();
router.use(authenticateToken);

async function guardTaskEdit(req, res, next) {
    const taskId = req.params.id || req.params.taskId;
    if (!(await canEditTask(req.user, taskId))) {
        return res.status(403).json({ error: 'Non puoi modificare questo task' });
    }
    next();
}

// Helper: carica subtasks + assignees per una lista di task
async function hydrateTasks(taskRows) {
    if (taskRows.length === 0) return [];
    const ids = taskRows.map(t => t.id);

    const subtasks = await pool.query(
        `SELECT subtask_id as id, task_id as "taskId", text, completed, position
         FROM subtasks WHERE task_id = ANY($1::uuid[]) ORDER BY position ASC`,
        [ids]
    );

    const assignees = await pool.query(
        `SELECT ta.task_id as "taskId", u.user_id as id, u.name, u.email,
                u.avatar_url as "avatarUrl", u.handle, u.color
         FROM task_assignees ta
         JOIN users u ON u.user_id = ta.user_id
         WHERE ta.task_id = ANY($1::uuid[])`,
        [ids]
    );

    return taskRows.map(t => ({
        ...t,
        subtasks: subtasks.rows.filter(s => s.taskId === t.id),
        assignees: assignees.rows.filter(a => a.taskId === t.id),
    }));
}

// GET /api/tasks - tutti i task (filtri opzionali)
router.get('/', async (req, res) => {
    try {
        const { projectId, columnId, sprintId } = req.query;
        const conditions = [];
        const params = [];

        if (projectId) { params.push(projectId); conditions.push(`t.project_id = $${params.length}`); }
        if (columnId)  { params.push(columnId);  conditions.push(`t.column_id = $${params.length}`); }
        if (sprintId)  { params.push(sprintId);  conditions.push(`t.sprint_id = $${params.length}`); }

        if (isSocio(req.user.role)) {
            params.push(req.user.userId);
            conditions.push(`EXISTS (
                SELECT 1 FROM task_assignees ta
                WHERE ta.task_id = t.task_id AND ta.user_id = $${params.length}
            )`);
        } else if (!isPrivileged(req.user.role)) {
            params.push(req.user.userId, req.user.area);
            conditions.push(`(
                p.area = $${params.length}
                OR p.area IS NULL
                OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.task_id AND ta.user_id = $${params.length - 1})
            )`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT t.task_id as id, t.project_id as "projectId", t.column_id as "columnId",
                    t.sprint_id as "sprintId", t.title, t.description, t.cover_url as "coverUrl",
                    t.priority, t.story_points as "storyPoints",
                    t.start_date as "startDate", t.due_date as "dueDate", t.position,
                    t.created_at as "createdAt", t.updated_at as "updatedAt",
                    p.name as "projectName", bc.name as "columnName", s.name as "sprintName"
             FROM tasks t
             LEFT JOIN projects p ON p.project_id = t.project_id
             LEFT JOIN board_columns bc ON bc.column_id = t.column_id
             LEFT JOIN sprints s ON s.sprint_id = t.sprint_id
             ${where}
             ORDER BY t.position ASC, t.created_at DESC`,
            params
        );

        res.json(await hydrateTasks(result.rows));
    } catch (error) {
        console.error('Errore recupero tasks:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/tasks/mytasks - Task assegnati all'utente (scadenze e lavori propri)
router.get('/mytasks', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.task_id as id, t.project_id as "projectId", t.title, t.description,
                    t.priority, t.due_date as "dueDate", t.updated_at as "updatedAt",
                    p.name as "projectName", p.area as "projectArea",
                    bc.name as "columnName"
             FROM tasks t
             INNER JOIN task_assignees ta ON ta.task_id = t.task_id AND ta.user_id = $1
             LEFT JOIN projects p ON p.project_id = t.project_id
             LEFT JOIN board_columns bc ON bc.column_id = t.column_id
             ORDER BY t.due_date ASC NULLS LAST, t.updated_at DESC`,
            [req.user.userId],
        );

        const statusFromColumn = (name) => {
            if (!name) return 'Da Fare';
            const n = name.toLowerCase();
            if (n.includes('complet') || n.includes('done')) return 'Completato';
            if (n.includes('revision')) return 'In Revisione';
            if (n.includes('corso') || n.includes('progress')) return 'In Corso';
            return 'Da Fare';
        };

        res.json(
            result.rows.map(row => ({
                id: row.id,
                description: row.description || row.title,
                projectName: row.projectName,
                projectArea: row.projectArea,
                priority: row.priority,
                dueDate: row.dueDate,
                updatedAt: row.updatedAt,
                status: statusFromColumn(row.columnName),
                columnName: row.columnName,
            })),
        );
    } catch (error) {
        console.error('Errore mytasks:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

const STATUS_TO_COLUMN_HINTS = {
    'Da Fare': ['da fare', 'todo', 'backlog', 'to do'],
    'In Corso': ['in corso', 'progress', 'doing', 'wip'],
    'In Revisione': ['revisione', 'review'],
    'Completato': ['complet', 'done', 'fatto'],
};

// PATCH /api/tasks/:id/status - Aggiorna stato (colonna kanban) dei propri task
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status obbligatorio' });

        if (!(await canEditTask(req.user, id))) {
            return res.status(403).json({ error: 'Non puoi modificare questo task' });
        }

        const taskRow = await pool.query(
            'SELECT project_id FROM tasks WHERE task_id = $1',
            [id],
        );
        if (!taskRow.rows.length) return res.status(404).json({ error: 'Task non trovato' });

        const hints = STATUS_TO_COLUMN_HINTS[status] || [status.toLowerCase()];
        const colResult = await pool.query(
            `SELECT column_id, name FROM board_columns
             WHERE project_id = $1
             ORDER BY position ASC`,
            [taskRow.rows[0].project_id],
        );

        let columnId = colResult.rows[0]?.column_id;
        for (const col of colResult.rows) {
            const name = (col.name || '').toLowerCase();
            if (hints.some(h => name.includes(h))) {
                columnId = col.column_id;
                break;
            }
        }

        const result = await pool.query(
            `UPDATE tasks SET column_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE task_id = $2
             RETURNING task_id as id`,
            [columnId, id],
        );

        res.json({ id: result.rows[0].id, status });
    } catch (error) {
        console.error('Errore update task status:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.task_id as id, t.project_id as "projectId", t.column_id as "columnId",
                    t.sprint_id as "sprintId", t.title, t.description, t.cover_url as "coverUrl",
                    t.priority, t.story_points as "storyPoints",
                    t.start_date as "startDate", t.due_date as "dueDate", t.position,
                    t.created_at as "createdAt", t.updated_at as "updatedAt"
             FROM tasks t WHERE t.task_id = $1`,
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Task non trovato' });
        const [task] = await hydrateTasks(result.rows);
        res.json(task);
    } catch (error) {
        console.error('Errore recupero task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/tasks
router.post('/', async (req, res) => {
    try {
        if (isSocio(req.user.role)) {
            return res.status(403).json({ error: 'I soci non possono creare nuovi task' });
        }

        const {
            projectId, columnId, sprintId, title, description, coverUrl,
            priority, storyPoints, startDate, dueDate, position, assigneeIds
        } = req.body;

        if (!projectId || !title) {
            return res.status(400).json({ error: 'projectId e title sono obbligatori' });
        }

        if (!(await canEditProjectTasks(req.user, projectId))) {
            return res.status(403).json({ error: 'Non puoi creare task in questo progetto' });
        }

        const result = await pool.query(
            `INSERT INTO tasks (project_id, column_id, sprint_id, title, description, cover_url,
                                priority, story_points, start_date, due_date, position, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING task_id as id, project_id as "projectId", column_id as "columnId",
                       sprint_id as "sprintId", title, description, cover_url as "coverUrl",
                       priority, story_points as "storyPoints",
                       start_date as "startDate", due_date as "dueDate", position,
                       created_at as "createdAt"`,
            [projectId, columnId || null, sprintId || null, title, description || null,
             coverUrl || null, priority || 'Media', storyPoints || 0,
             startDate || null, dueDate || null, position || 0, req.user.userId]
        );

        const task = result.rows[0];

        if (Array.isArray(assigneeIds) && assigneeIds.length) {
            const values = assigneeIds.map((_, i) => `($1, $${i + 2})`).join(',');
            await pool.query(
                `INSERT INTO task_assignees (task_id, user_id) VALUES ${values}
                 ON CONFLICT DO NOTHING`,
                [task.id, ...assigneeIds]
            );
            scheduleNotify(notifyTaskAssigned({
                taskId: task.id,
                projectId,
                title,
                actorId: req.user.userId,
                recipientIds: assigneeIds,
            }));
        }

        await pool.query(
            `INSERT INTO activities (actor_id, type, target_type, target_id, project_id, payload)
             VALUES ($1, 'task.created', 'task', $2, $3, $4::jsonb)`,
            [req.user.userId, task.id, projectId, JSON.stringify({ title })]
        );

        const [hydrated] = await hydrateTasks([task]);
        res.status(201).json(hydrated);
    } catch (error) {
        console.error('Errore creazione task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isSocio(req.user.role)) {
            return res.status(403).json({ error: 'Usa PATCH /api/tasks/:id/status per aggiornare i tuoi lavori' });
        }

        if (!(await canEditTask(req.user, id))) {
            return res.status(403).json({ error: 'Non puoi modificare questo task' });
        }

        const {
            columnId, sprintId, title, description, coverUrl,
            priority, storyPoints, startDate, dueDate, position
        } = req.body;

        const result = await pool.query(
            `UPDATE tasks SET
                column_id   = COALESCE($1, column_id),
                sprint_id   = COALESCE($2, sprint_id),
                title       = COALESCE($3, title),
                description = COALESCE($4, description),
                cover_url   = COALESCE($5, cover_url),
                priority    = COALESCE($6, priority),
                story_points= COALESCE($7, story_points),
                start_date  = COALESCE($8, start_date),
                due_date    = COALESCE($9, due_date),
                position    = COALESCE($10, position),
                updated_at  = CURRENT_TIMESTAMP
             WHERE task_id = $11
             RETURNING task_id as id, project_id as "projectId", column_id as "columnId",
                       sprint_id as "sprintId", title, description, cover_url as "coverUrl",
                       priority, story_points as "storyPoints",
                       start_date as "startDate", due_date as "dueDate", position,
                       created_at as "createdAt"`,
            [columnId, sprintId, title, description, coverUrl, priority,
             storyPoints, startDate, dueDate, position, req.params.id]
        );

        if (!result.rows.length) return res.status(404).json({ error: 'Task non trovato' });
        const [hydrated] = await hydrateTasks([result.rows[0]]);
        res.json(hydrated);
    } catch (error) {
        console.error('Errore aggiornamento task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PATCH /api/tasks/:id/move - sposta tra colonne (drag & drop)
router.patch('/:id/move', guardTaskEdit, async (req, res) => {
    try {
        const { columnId, position } = req.body;
        const result = await pool.query(
            `UPDATE tasks SET column_id = $1, position = COALESCE($2, position),
                              updated_at = CURRENT_TIMESTAMP
             WHERE task_id = $3
             RETURNING task_id as id, column_id as "columnId", position`,
            [columnId, position, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Task non trovato' });

        await pool.query(
            `INSERT INTO activities (actor_id, type, target_type, target_id, payload)
             VALUES ($1, 'task.moved', 'task', $2, $3::jsonb)`,
            [req.user.userId, req.params.id, JSON.stringify({ columnId, position })]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore move task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// DELETE /api/tasks/:id
router.delete('/:id', guardTaskEdit, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE task_id = $1 RETURNING task_id',
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Task non trovato' });
        res.json({ message: 'Task eliminato' });
    } catch (error) {
        console.error('Errore delete task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// --- Subtasks ---
router.post('/:id/subtasks', guardTaskEdit, async (req, res) => {
    try {
        const { text, position } = req.body;
        if (!text) return res.status(400).json({ error: 'text obbligatorio' });
        const result = await pool.query(
            `INSERT INTO subtasks (task_id, text, position)
             VALUES ($1, $2, COALESCE($3, 0))
             RETURNING subtask_id as id, task_id as "taskId", text, completed, position`,
            [req.params.id, text, position]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Errore add subtask:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.patch('/:taskId/subtasks/:subtaskId/toggle', guardTaskEdit, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE subtasks SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP
             WHERE subtask_id = $1 AND task_id = $2
             RETURNING subtask_id as id, task_id as "taskId", text, completed, position`,
            [req.params.subtaskId, req.params.taskId]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Subtask non trovato' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore toggle subtask:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.delete('/:taskId/subtasks/:subtaskId', guardTaskEdit, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM subtasks WHERE subtask_id = $1 AND task_id = $2 RETURNING subtask_id',
            [req.params.subtaskId, req.params.taskId]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Subtask non trovato' });
        res.json({ message: 'Subtask eliminato' });
    } catch (error) {
        console.error('Errore delete subtask:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// --- Assignees ---
router.post('/:id/assignees', guardTaskEdit, async (req, res) => {
    try {
        const { userId } = req.body;
        await pool.query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [req.params.id, userId]
        );
        const task = await pool.query(
            'SELECT title, project_id as "projectId" FROM tasks WHERE task_id = $1',
            [req.params.id],
        );
        if (userId && task.rows[0]) {
            scheduleNotify(notifyTaskAssigned({
                taskId: req.params.id,
                projectId: task.rows[0].projectId,
                title: task.rows[0].title,
                actorId: req.user.userId,
                recipientIds: [userId],
            }));
        }
        res.status(201).json({ message: 'Assegnato' });
    } catch (error) {
        console.error('Errore add assignee:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.delete('/:id/assignees/:userId', guardTaskEdit, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2',
            [req.params.id, req.params.userId]
        );
        res.json({ message: 'Rimosso' });
    } catch (error) {
        console.error('Errore remove assignee:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// --- Board columns (lette per progetto) ---
router.get('/columns/by-project/:projectId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT column_id as id, project_id as "projectId", name, accent, position
             FROM board_columns WHERE project_id = $1 ORDER BY position ASC`,
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Errore get columns:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;

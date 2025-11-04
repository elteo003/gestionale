import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Middleware per verificare se l'utente è manager o assegnato al progetto
const canManageProject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        // Admin, IT, Responsabile possono gestire tutti i progetti
        if (userRole === 'Admin' || userRole === 'IT' || userRole === 'Responsabile') {
            return next();
        }
        
        // Verifica se l'utente è assegnato al progetto o è manager dell'area
        const projectResult = await pool.query(
            `SELECT p.area, pa.user_id
             FROM projects p
             LEFT JOIN project_assignments pa ON p.project_id = pa.project_id AND pa.user_id = $1
             WHERE p.project_id = $2`,
            [userId, id]
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
        
        // Se l'utente è assegnato al progetto o è manager dell'area, può gestirlo
        if (project.user_id || (user.area === project.area && (user.role === 'IT' || user.role === 'Marketing' || user.role === 'Commerciale'))) {
            return next();
        }
        
        res.status(403).json({ error: 'Accesso negato. Solo manager dell\'area o membri del team possono gestire questo progetto.' });
    } catch (error) {
        console.error('Errore verifica permessi progetto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/mytasks - Restituisce i task assegnati all'utente corrente
router.get('/mytasks', async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Verifica se la tabella tasks esiste
        const tableCheck = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tasks'
            )`
        );
        
        if (!tableCheck.rows[0].exists) {
            // La tabella tasks non esiste ancora, probabilmente la migration non è stata eseguita
            console.warn('Tabella tasks non trovata. Esegui la migration: backend/database/migration_tasks_and_assignments.sql');
            return res.json([]); // Restituisci array vuoto invece di errore
        }
        
        const result = await pool.query(
            `SELECT t.task_id as id, t.description, t.status, t.priority, 
                    t.assigned_to_user_id as "assignedTo", t.created_at as "createdAt", t.updated_at as "updatedAt",
                    p.project_id as "projectId", p.name as "projectName", p.area as "projectArea",
                    u.name as "assignedToName"
             FROM tasks t
             JOIN projects p ON t.project_id = p.project_id
             LEFT JOIN users u ON t.assigned_to_user_id = u.user_id
             WHERE t.assigned_to_user_id = $1 AND t.status != 'Completato'
             ORDER BY t.priority DESC, t.created_at ASC`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero my tasks:', error);
        // Se è un errore di tabella non esistente, restituisci array vuoto
        if (error.code === '42P01') { // PostgreSQL error code for "relation does not exist"
            console.warn('Tabella tasks non trovata. Esegui la migration: backend/database/migration_tasks_and_assignments.sql');
            return res.json([]);
        }
        res.status(500).json({ error: 'Errore interno del server', details: error.message });
    }
});

// PUT /api/tasks/:id/assign - Assegna un task a un utente (Manager)
router.put('/:id/assign', canManageProject, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID richiesto' });
        }
        
        // Verifica che l'utente esista
        const userCheck = await pool.query(
            'SELECT user_id FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }
        
        const result = await pool.query(
            `UPDATE tasks
             SET assigned_to_user_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE task_id = $2
             RETURNING task_id as id, description, status, priority, 
                       assigned_to_user_id as "assignedTo", created_at as "createdAt", updated_at as "updatedAt"`,
            [userId, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task non trovato' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore assegnazione task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// PUT /api/tasks/:id/status - Aggiorna lo stato del proprio task (Associato)
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.userId;
        
        if (!status) {
            return res.status(400).json({ error: 'Status richiesto' });
        }
        
        if (!['Da Fare', 'In Corso', 'Completato', 'In Revisione'].includes(status)) {
            return res.status(400).json({ error: 'Status non valido' });
        }
        
        // Verifica che il task sia assegnato all'utente corrente
        const taskCheck = await pool.query(
            'SELECT task_id, assigned_to_user_id FROM tasks WHERE task_id = $1',
            [id]
        );
        
        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Task non trovato' });
        }
        
        if (taskCheck.rows[0].assigned_to_user_id !== userId) {
            return res.status(403).json({ error: 'Puoi aggiornare solo i tuoi task assegnati' });
        }
        
        const result = await pool.query(
            `UPDATE tasks
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE task_id = $2 AND assigned_to_user_id = $3
             RETURNING task_id as id, description, status, priority, 
                       assigned_to_user_id as "assignedTo", created_at as "createdAt", updated_at as "updatedAt"`,
            [status, id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task non trovato o non assegnato a te' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore aggiornamento stato task:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;


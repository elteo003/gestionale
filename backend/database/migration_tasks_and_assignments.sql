-- Migration: Sistema Tasks e Assegnazioni Progetti
-- Sostituisce la vecchia todo list con un sistema di task assegnabili

-- 1. Crea tabella Tasks (sostituisce la vecchia todos)
CREATE TABLE IF NOT EXISTS tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Da Fare' CHECK (status IN ('Da Fare', 'In Corso', 'Completato', 'In Revisione')),
    priority VARCHAR(20) DEFAULT 'Media' CHECK (priority IN ('Bassa', 'Media', 'Alta')),
    assigned_to_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crea tabella Project_Assignments (Membri del Progetto)
CREATE TABLE IF NOT EXISTS project_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id) -- Un utente può essere assegnato una sola volta a un progetto
);

-- 3. Migra dati dalla vecchia tabella todos (se esiste)
-- Nota: Questo script assume che todos esista già. Se non esiste, ignora l'errore.
DO $$
BEGIN
    -- Migra tutti i todos esistenti nella nuova tabella tasks
    INSERT INTO tasks (project_id, description, status, priority, created_at, updated_at)
    SELECT 
        project_id,
        text as description,
        CASE 
            WHEN completed = TRUE THEN 'Completato'
            ELSE 'Da Fare'
        END as status,
        priority,
        created_at,
        updated_at
    FROM todos
    WHERE NOT EXISTS (
        SELECT 1 FROM tasks WHERE tasks.project_id = todos.project_id 
        AND tasks.description = todos.text
    );
EXCEPTION
    WHEN undefined_table THEN
        -- Se todos non esiste, non fare nulla
        RAISE NOTICE 'Tabella todos non trovata, nessuna migrazione necessaria';
END $$;

-- 4. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);

-- 5. Aggiungi trigger per aggiornare updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Commenti per documentazione
COMMENT ON TABLE tasks IS 'Task assegnabili ai membri del team per ogni progetto';
COMMENT ON TABLE project_assignments IS 'Associazioni tra utenti e progetti (membri del team)';
COMMENT ON COLUMN tasks.assigned_to_user_id IS 'NULL = task non ancora assegnato (in backlog)';


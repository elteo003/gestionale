-- Migration: Aggiungi Optimistic Locking con campo version
-- Previene conflitti di modifica simultanea usando version control

-- Aggiungi campo version alle tabelle principali
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Aggiorna version a 1 per tutti i record esistenti (se non già presente)
UPDATE projects SET version = 1 WHERE version IS NULL;
UPDATE clients SET version = 1 WHERE version IS NULL;
UPDATE contracts SET version = 1 WHERE version IS NULL;
UPDATE tasks SET version = 1 WHERE version IS NULL;
UPDATE events SET version = 1 WHERE version IS NULL;

-- Crea trigger per incrementare automaticamente version su UPDATE
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger alle tabelle (solo se non esiste già)
DROP TRIGGER IF EXISTS trigger_projects_version ON projects;
CREATE TRIGGER trigger_projects_version
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_clients_version ON clients;
CREATE TRIGGER trigger_clients_version
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_contracts_version ON contracts;
CREATE TRIGGER trigger_contracts_version
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_tasks_version ON tasks;
CREATE TRIGGER trigger_tasks_version
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_events_version ON events;
CREATE TRIGGER trigger_events_version
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- Commenti per documentazione
COMMENT ON COLUMN projects.version IS 'Versione per optimistic locking - previene conflitti di modifica simultanea';
COMMENT ON COLUMN clients.version IS 'Versione per optimistic locking - previene conflitti di modifica simultanea';
COMMENT ON COLUMN contracts.version IS 'Versione per optimistic locking - previene conflitti di modifica simultanea';
COMMENT ON COLUMN tasks.version IS 'Versione per optimistic locking - previene conflitti di modifica simultanea';
COMMENT ON COLUMN events.version IS 'Versione per optimistic locking - previene conflitti di modifica simultanea';


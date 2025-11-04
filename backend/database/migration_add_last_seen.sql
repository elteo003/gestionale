-- Migration: Aggiungi colonna last_seen alla tabella users
-- Esegui questo script sul database per aggiungere il tracking degli utenti connessi

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NULL;

-- Aggiungi anche colonna is_active per disattivare utenti (opzionale)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Aggiorna il CHECK constraint per role per includere tutti i ruoli
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('Socio', 'Responsabile', 'Admin', 'Presidente', 'CDA', 'Tesoreria', 'Marketing', 'Commerciale', 'IT', 'Audit'));

-- Crea indice per migliorare performance query last_seen
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);


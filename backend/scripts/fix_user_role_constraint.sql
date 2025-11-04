-- Script per aggiornare il constraint del ruolo nella tabella users
-- Esegui questo script sul database se i ruoli non vengono accettati

-- Rimuovi il constraint esistente
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Aggiungi il nuovo constraint con tutti i ruoli
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('Socio', 'Responsabile', 'Admin', 'Presidente', 'CDA', 'Tesoreria', 'Marketing', 'Commerciale', 'IT', 'Audit'));

-- Verifica che la colonna is_active esista
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Verifica che la colonna last_seen esista
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NULL;


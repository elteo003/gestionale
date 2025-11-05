-- Migration: Modulo HR - Recruiting e Onboarding
-- Aggiunge supporto per candidati, colloqui e periodi di prova

-- ============================================
-- 1. TABELLA CANDIDATES (Candidati)
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cv_url TEXT,
    status VARCHAR(50) DEFAULT 'In attesa' CHECK (status IN ('In attesa', 'In colloquio', 'Accettato', 'Rifiutato')),
    area_competenza VARCHAR(50) CHECK (area_competenza IN ('IT', 'Marketing', 'Commerciale', 'CDA')),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_area_competenza ON candidates(area_competenza);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates(created_by);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE candidates IS 'Candidati per assunzione - gestione processo recruiting';
COMMENT ON COLUMN candidates.cv_url IS 'Link esterno al CV (GDrive, S3, ecc.)';
COMMENT ON COLUMN candidates.status IS 'Stato nel processo di recruiting';

-- ============================================
-- 2. MODIFICA TABELLA SCHEDULING_POLLS
-- ============================================
-- Aggiunge riferimento opzionale a candidate per sondaggi di colloquio
ALTER TABLE scheduling_polls ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE SET NULL;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_scheduling_polls_candidate_id ON scheduling_polls(candidate_id);

-- Commento
COMMENT ON COLUMN scheduling_polls.candidate_id IS 'Riferimento opzionale a candidato per sondaggi di colloquio';

-- ============================================
-- 3. MODIFICA TABELLA EVENTS
-- ============================================
-- Assicuriamoci che event_type supporti 'colloquio'
-- (Dovrebbe già essere gestito dalla migration_advanced_events.sql, ma verifichiamo)
DO $$
BEGIN
    -- Verifica se il constraint esiste
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_event_type_check'
    ) THEN
        -- Se non esiste, aggiungilo (ma solo se event_type esiste)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' AND column_name = 'event_type'
        ) THEN
            ALTER TABLE events ADD CONSTRAINT events_event_type_check 
                CHECK (event_type IN ('call', 'networking', 'formazione', 'generic', 'colloquio'));
        END IF;
    ELSE
        -- Se esiste, modificalo per includere 'colloquio'
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
        ALTER TABLE events ADD CONSTRAINT events_event_type_check 
            CHECK (event_type IN ('call', 'networking', 'formazione', 'generic', 'colloquio'));
    END IF;
END $$;

-- Aggiungi colonna candidate_id a events (opzionale, per eventi di colloquio)
ALTER TABLE events ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE SET NULL;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_events_candidate_id ON events(candidate_id);

-- Commento
COMMENT ON COLUMN events.candidate_id IS 'Riferimento opzionale a candidato per eventi di colloquio';


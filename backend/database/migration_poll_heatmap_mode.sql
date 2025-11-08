-- Migration: Estensione Sondaggi con Modalità Heatmap
-- Aggiunge poll_type a scheduling_polls e tabella open_availability_votes

-- ============================================
-- 1. Colonna poll_type su scheduling_polls
-- ============================================
ALTER TABLE scheduling_polls
    ADD COLUMN IF NOT EXISTS poll_type VARCHAR(32);

-- Assicurati che le righe esistenti abbiano un valore di default
UPDATE scheduling_polls
SET poll_type = 'fixed_slots'
WHERE poll_type IS NULL;

-- Imposta default e not null
ALTER TABLE scheduling_polls
    ALTER COLUMN poll_type SET DEFAULT 'fixed_slots';

ALTER TABLE scheduling_polls
    ALTER COLUMN poll_type SET NOT NULL;

-- Aggiungi constraint per valori consentiti (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scheduling_polls_poll_type_check'
          AND conrelid = 'scheduling_polls'::regclass
    ) THEN
        ALTER TABLE scheduling_polls
            ADD CONSTRAINT scheduling_polls_poll_type_check
            CHECK (poll_type IN ('fixed_slots', 'open_availability'));
    END IF;
END $$;

COMMENT ON COLUMN scheduling_polls.poll_type IS 'Modalità del sondaggio: fixed_slots (slot predefiniti) o open_availability (heatmap)';

-- ============================================
-- 2. Tabella open_availability_votes
-- ============================================
CREATE TABLE IF NOT EXISTS open_availability_votes (
    vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES scheduling_polls(poll_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    slot_start_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, user_id, slot_start_time)
);

CREATE INDEX IF NOT EXISTS idx_open_availability_votes_poll_id
    ON open_availability_votes(poll_id);

CREATE INDEX IF NOT EXISTS idx_open_availability_votes_slot
    ON open_availability_votes(slot_start_time);

COMMENT ON TABLE open_availability_votes IS 'Disponibilità granulari per sondaggi open_availability (heatmap)';
COMMENT ON COLUMN open_availability_votes.slot_start_time IS 'Inizio dello slot disponibile scelto dall\'utente';

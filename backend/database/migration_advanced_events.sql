-- Migration: Sistema Eventi Avanzato con Tipi, Regole di Invito e Ricorrenza
-- Aggiunge supporto per tipi di evento diversi, regole di invito complesse e ricorrenza

-- 1. Aggiungi nuovi campi alla tabella events
ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'generic' 
        CHECK (event_type IN ('call', 'networking', 'formazione', 'generic')),
    ADD COLUMN IF NOT EXISTS event_subtype VARCHAR(50),
    ADD COLUMN IF NOT EXISTS area VARCHAR(50),
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invitation_rules JSONB,
    ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) DEFAULT 'none' 
        CHECK (recurrence_type IN ('none', 'weekly', 'monthly')),
    ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

-- 2. Aggiorna eventi esistenti: se is_call = true, imposta event_type = 'call'
UPDATE events 
SET event_type = 'call', event_subtype = 'call_interna'
WHERE is_call = TRUE AND event_type IS NULL;

-- 3. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_area ON events(area);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);
CREATE INDEX IF NOT EXISTS idx_events_recurrence_type ON events(recurrence_type);

-- 4. Commenti per documentazione
COMMENT ON COLUMN events.event_type IS 'Tipo principale di evento: call, networking, formazione, generic';
COMMENT ON COLUMN events.event_subtype IS 'Sottotipo per eventi call: call_interna, call_reparto, call_clienti';
COMMENT ON COLUMN events.area IS 'Area dell''organizzazione (IT, Marketing, Commerciale, CDA) - usato per call_reparto';
COMMENT ON COLUMN events.client_id IS 'Riferimento al cliente - usato per call_clienti';
COMMENT ON COLUMN events.invitation_rules IS 'Regole JSON per generare inviti: {groups: [], individuals: [], area: ""}';
COMMENT ON COLUMN events.recurrence_type IS 'Tipo di ricorrenza: none, weekly, monthly';
COMMENT ON COLUMN events.recurrence_end_date IS 'Data di fine ricorrenza (NULL = nessuna ricorrenza)';


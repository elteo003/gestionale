-- Migration: Reportistica Eventi (Verbali) e Sistema di Pianificazione (Sondaggi)
-- Aggiunge supporto per verbali post-evento e sondaggi di disponibilità

-- ============================================
-- 1. TABELLA EVENT_REPORTS (Verbali)
-- ============================================
CREATE TABLE IF NOT EXISTS event_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
    creator_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    report_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_event_reports_event_id ON event_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reports_creator_user_id ON event_reports(creator_user_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_event_reports_updated_at BEFORE UPDATE ON event_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE event_reports IS 'Verbali e report post-evento creati da manager/CDA';
COMMENT ON COLUMN event_reports.report_content IS 'Contenuto del verbale (supporta Markdown)';

-- ============================================
-- 2. TABELLA SCHEDULING_POLLS (Sondaggi)
-- ============================================
CREATE TABLE IF NOT EXISTS scheduling_polls (
    poll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    invitation_rules JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    final_event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_scheduling_polls_creator_user_id ON scheduling_polls(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_polls_status ON scheduling_polls(status);
CREATE INDEX IF NOT EXISTS idx_scheduling_polls_final_event_id ON scheduling_polls(final_event_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_scheduling_polls_updated_at BEFORE UPDATE ON scheduling_polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE scheduling_polls IS 'Sondaggi di disponibilità per organizzare eventi';
COMMENT ON COLUMN scheduling_polls.duration_minutes IS 'Durata prevista dell\'evento in minuti';
COMMENT ON COLUMN scheduling_polls.invitation_rules IS 'Regole di invito (stesso formato di events.invitation_rules)';
COMMENT ON COLUMN scheduling_polls.status IS 'open = sondaggio attivo, closed = evento creato';
COMMENT ON COLUMN scheduling_polls.final_event_id IS 'Link all\'evento finale creato da questo sondaggio';

-- ============================================
-- 3. TABELLA POLL_TIME_SLOTS (Slot Temporali)
-- ============================================
CREATE TABLE IF NOT EXISTS poll_time_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES scheduling_polls(poll_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_poll_time_slots_poll_id ON poll_time_slots(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_time_slots_start_time ON poll_time_slots(start_time);

-- Commenti per documentazione
COMMENT ON TABLE poll_time_slots IS 'Opzioni temporali proposte nel sondaggio';

-- ============================================
-- 4. TABELLA POLL_VOTES (Voti)
-- ============================================
CREATE TABLE IF NOT EXISTS poll_votes (
    vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID REFERENCES poll_time_slots(slot_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id, user_id) -- Un utente può votare solo una volta per slot
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_poll_votes_slot_id ON poll_votes(slot_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);

-- Commenti per documentazione
COMMENT ON TABLE poll_votes IS 'Voti degli utenti per gli slot temporali proposti';


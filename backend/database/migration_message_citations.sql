-- Citazioni su tabella dedicata: l'utente app può CREATE TABLE, non ALTER su messages.

CREATE TABLE IF NOT EXISTS message_citations (
    message_id UUID PRIMARY KEY REFERENCES messages(message_id) ON DELETE CASCADE,
    reply_to_id UUID REFERENCES messages(message_id) ON DELETE SET NULL,
    cited_resource_id UUID REFERENCES project_resources(resource_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_citations_reply
    ON message_citations (reply_to_id)
    WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_citations_resource
    ON message_citations (cited_resource_id)
    WHERE cited_resource_id IS NOT NULL;

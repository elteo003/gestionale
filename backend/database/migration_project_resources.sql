-- Link di documentazione per progetto (Drive, Notion, brief).
CREATE TABLE IF NOT EXISTS project_resources (
    resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    url TEXT NOT NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_resources_project
    ON project_resources(project_id, created_at DESC);

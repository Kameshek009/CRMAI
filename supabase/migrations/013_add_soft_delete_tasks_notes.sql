-- Add soft delete columns to tasks and notes
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Partial indexes for efficient queries on non-deleted rows
CREATE INDEX IF NOT EXISTS idx_crm_tasks_not_deleted ON crm_tasks(team_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_crm_notes_not_deleted ON crm_notes(team_id) WHERE is_deleted = false;

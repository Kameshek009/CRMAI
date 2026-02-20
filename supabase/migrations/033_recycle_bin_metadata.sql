-- ============================================================================
-- Migration 033: Add deleted_at/deleted_by to CRM tables for Recycle Bin
-- ============================================================================

-- contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES accounts(id);

-- companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES accounts(id);

-- deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES accounts(id);

-- crm_tasks
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES accounts(id);

-- crm_notes
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES accounts(id);

-- call_logs
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES accounts(id);

-- Indexes for efficient trash queries
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(team_id, deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(team_id, deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(team_id, deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_deleted_at ON crm_tasks(team_id, deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_crm_notes_deleted_at ON crm_notes(team_id, deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_call_logs_deleted_at ON call_logs(team_id, deleted_at) WHERE is_deleted = true;

-- ============================================================================
COMMENT ON COLUMN contacts.deleted_at IS 'When the record was soft-deleted (for recycle bin)';
COMMENT ON COLUMN contacts.deleted_by IS 'Who deleted the record (account ID)';

-- ============================================================================
-- Migration 023: Record Visibility + Audit Log
-- ============================================================================

-- ============================================================================
-- Add visibility & assigned_to columns to CRM tables
-- ============================================================================

-- Visibility: 'workspace' = all members can see, 'private' = only creator/assignee
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'workspace';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'workspace';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'workspace';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'workspace';

-- assigned_to for contacts and leads (deals already have it from migration 012)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES accounts(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES accounts(id);

-- Indexes for assigned_to
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

-- ============================================================================
-- Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  actor_name TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,  -- 'create', 'update', 'delete'
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_team ON audit_log(team_id, created_at DESC);
CREATE INDEX idx_audit_log_account ON audit_log(account_id, created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Performance indexes for frequently queried columns
-- These indexes improve query performance on CRM operations

-- Contacts: team + soft delete filter (used in every contacts query)
CREATE INDEX IF NOT EXISTS idx_contacts_team_not_deleted
  ON contacts (team_id) WHERE is_deleted = false;

-- Companies: team + soft delete filter
CREATE INDEX IF NOT EXISTS idx_companies_team_not_deleted
  ON companies (team_id) WHERE is_deleted = false;

-- Deals: team + soft delete filter
CREATE INDEX IF NOT EXISTS idx_deals_team_not_deleted
  ON deals (team_id) WHERE is_deleted = false;

-- Deals: status filter for pipeline/stats queries
CREATE INDEX IF NOT EXISTS idx_deals_team_status
  ON deals (team_id, status) WHERE is_deleted = false;

-- CRM Tasks: team + soft delete + due_date ordering
CREATE INDEX IF NOT EXISTS idx_crm_tasks_team_not_deleted
  ON crm_tasks (team_id, due_date) WHERE is_deleted = false;

-- CRM Tasks: overdue tasks query
CREATE INDEX IF NOT EXISTS idx_crm_tasks_team_status_due
  ON crm_tasks (team_id, status, due_date) WHERE is_deleted = false;

-- CRM Notes: team + soft delete + pinned/date ordering
CREATE INDEX IF NOT EXISTS idx_crm_notes_team_not_deleted
  ON crm_notes (team_id, is_pinned DESC, created_at DESC) WHERE is_deleted = false;

-- CRM Activities: team + created_at for activity feed
CREATE INDEX IF NOT EXISTS idx_crm_activities_team_created
  ON crm_activities (team_id, created_at DESC);

-- Accounts: clerk_user_id lookup (used in auth)
CREATE INDEX IF NOT EXISTS idx_accounts_clerk_user_id
  ON accounts (clerk_user_id);

-- Deal stages: team + position ordering
CREATE INDEX IF NOT EXISTS idx_deal_stages_team_position
  ON deal_stages (team_id, position);

-- Team members: team + active members
CREATE INDEX IF NOT EXISTS idx_team_members_team_active
  ON team_members (team_id) WHERE left_at IS NULL;

-- Desktop sessions: refresh token lookup
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_refresh_token
  ON desktop_sessions (refresh_token) WHERE revoked = false;

-- Usage records: account + created_at for history
CREATE INDEX IF NOT EXISTS idx_usage_records_account_created
  ON usage_records (account_id, created_at DESC);

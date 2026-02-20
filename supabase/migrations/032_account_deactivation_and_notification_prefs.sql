-- ============================================================================
-- Migration 032: Account deactivation + notification preferences
-- ============================================================================

-- Account deactivation fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Index for quick is_active checks in auth/verify
CREATE INDEX IF NOT EXISTS idx_accounts_active_clerk ON accounts(clerk_user_id, is_active);

-- Notification preferences (JSONB on accounts — avoids extra table for 4 booleans)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"deal_assigned":true,"task_due":true,"new_team_member":true,"weekly_digest":true}';

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN accounts.is_active IS 'Whether the account is active. false = deactivated (data preserved, access blocked)';
COMMENT ON COLUMN accounts.deactivated_at IS 'Timestamp when the account was deactivated';
COMMENT ON COLUMN accounts.notification_preferences IS 'Email notification preferences as JSONB';

-- ============================================================================
-- Migration 015: Team soft-delete support
-- Adds deleted_at column for 24h recovery, fixes FK on accounts.current_team_id
-- ============================================================================

-- Add soft-delete column to teams
ALTER TABLE teams ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_teams_deleted_at ON teams(deleted_at) WHERE deleted_at IS NOT NULL;

-- Fix FK: when a team is deleted, set current_team_id to NULL
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_current_team_id_fkey;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_current_team_id_fkey
  FOREIGN KEY (current_team_id) REFERENCES teams(id) ON DELETE SET NULL;

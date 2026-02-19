-- ============================================================================
-- Migration 030: Team Hierarchy (parent_team_id)
-- ============================================================================

-- Add parent_team_id for team hierarchy
ALTER TABLE teams ADD COLUMN parent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Index for hierarchy queries (find children)
CREATE INDEX idx_teams_parent ON teams(parent_team_id) WHERE parent_team_id IS NOT NULL;

-- Prevent circular references: team cannot be its own parent
ALTER TABLE teams ADD CONSTRAINT chk_no_self_parent CHECK (parent_team_id != id);

-- Migration 057: rule-based lead scoring (Phase 2 wave A feature 2)
--
-- Adds a per-team table of scoring rules and three columns on leads to
-- cache the most recent score / breakdown / timestamp. Score is clamped to
-- 0..100 by the application — column is plain INT so we can survive a
-- migration of the clamp logic without an ALTER.
--
-- A rule is `{ field, operator, value }` — only one condition per rule.
-- Composite logic is expressed by registering multiple rules. This keeps
-- the UI and evaluator trivial while covering the typical CRM use cases.
-- A future ML model can read `score_breakdown` as a feature vector.

BEGIN;

CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- condition shape: { "field": "phone", "operator": "not_empty", "value": null }
  -- field supports dotted paths into metadata: "metadata.budget"
  condition JSONB NOT NULL,
  weight INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: the recompute hot path only ever reads active rules.
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_team_active
  ON lead_scoring_rules (team_id, sort_order)
  WHERE is_active = true;

CREATE TRIGGER trg_lead_scoring_rules_updated_at
  BEFORE UPDATE ON lead_scoring_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;

-- Score cache on leads. NULL score_computed_at means the lead has never
-- been scored — useful for the nightly cron to backfill new rows.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_computed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- Sort/filter by score within a team. Partial because deleted leads are
-- never queried by score.
CREATE INDEX IF NOT EXISTS idx_leads_team_score
  ON leads (team_id, score DESC)
  WHERE is_deleted = false;

COMMENT ON TABLE lead_scoring_rules IS
  'Per-team rule definitions for rule-based lead scoring. Single condition per row; composite logic is expressed by multiple rules.';
COMMENT ON COLUMN leads.score IS
  'Cached score in 0..100, recomputed on lead create/update and nightly. 0 also means "no active rules".';
COMMENT ON COLUMN leads.score_breakdown IS
  'Array of { rule_id, name, matched, contribution } from the last recompute. Doubles as feature log for future ML scoring.';

COMMIT;

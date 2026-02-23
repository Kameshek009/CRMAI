-- ============================================================================
-- 040: Performance indexes, unique constraints, RPC aggregation functions
-- ============================================================================

-- Unique email per team (partial: only non-deleted, non-empty emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_team_email_unique
  ON contacts (team_id, lower(email))
  WHERE is_deleted = false AND email IS NOT NULL AND email != '';

-- FK indexes for faster JOINs
CREATE INDEX IF NOT EXISTS idx_contacts_company_id
  ON contacts(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_contact_id
  ON deals(contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_company_id
  ON deals(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id
  ON crm_activities(contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_deal_id
  ON crm_activities(deal_id) WHERE deal_id IS NOT NULL;

-- Composite index for entity-scoped audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log(team_id, entity_type, entity_id);

-- ============================================================================
-- RPC functions for aggregated stats (avoids loading 1000+ rows client-side)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deal_stats(p_team_id UUID)
RETURNS TABLE(
  open_count BIGINT,
  pipeline_value NUMERIC,
  weighted_forecast NUMERIC
) AS $$
  SELECT
    COUNT(*),
    COALESCE(SUM(value), 0),
    COALESCE(SUM(value * ai_win_probability / 100.0), 0)
  FROM deals
  WHERE team_id = p_team_id
    AND status = 'open'
    AND is_deleted = false;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_won_deals_stats(p_team_id UUID, p_since DATE)
RETURNS TABLE(
  won_count BIGINT,
  won_value NUMERIC
) AS $$
  SELECT
    COUNT(*),
    COALESCE(SUM(value), 0)
  FROM deals
  WHERE team_id = p_team_id
    AND status = 'won'
    AND is_deleted = false
    AND actual_close_date >= p_since;
$$ LANGUAGE sql STABLE;

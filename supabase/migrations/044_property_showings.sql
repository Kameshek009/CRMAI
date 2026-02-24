-- ============================================================================
-- 044: Property Showings table for real estate CRM
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  showing_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  agent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  result_notes TEXT,
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showings_team ON property_showings(team_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_showings_date ON property_showings(team_id, showing_date) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_showings_contact ON property_showings(contact_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_showings_deal ON property_showings(deal_id) WHERE NOT is_deleted;

ALTER TABLE property_showings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON property_showings FOR ALL TO service_role USING (true);

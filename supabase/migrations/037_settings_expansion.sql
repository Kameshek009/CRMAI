-- ============================================================================
-- Migration 037: Settings Expansion
-- Multi-currency, Business Hours, Deal Lost Reasons, Login History,
-- Data Access Rules (extend visibility_groups)
-- ============================================================================

-- 1. Multi-currency: exchange rates + default_currency on teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD';

CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  rate_to_usd NUMERIC(15,6) NOT NULL DEFAULT 1.0,
  symbol TEXT DEFAULT '$',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_currency_rates_team ON currency_rates(team_id);
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- 2. Business hours
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,  -- 0=Mon, 1=Tue ... 6=Sun
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  UNIQUE(team_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_team ON business_hours(team_id);
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- 3. Deal lost reasons
CREATE TABLE IF NOT EXISTS deal_lost_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_lost_reasons_team ON deal_lost_reasons(team_id);
ALTER TABLE deal_lost_reasons ENABLE ROW LEVEL SECURITY;

ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason_id UUID REFERENCES deal_lost_reasons(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason_note TEXT;

-- 4. Login history
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_account ON login_history(account_id, created_at DESC);
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- 5. Extend visibility_groups for data access rules
ALTER TABLE visibility_groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE visibility_groups ADD COLUMN IF NOT EXISTS entity_types TEXT[] DEFAULT '{contacts,companies,deals}';
ALTER TABLE visibility_groups ADD COLUMN IF NOT EXISTS rule_type TEXT NOT NULL DEFAULT 'include';

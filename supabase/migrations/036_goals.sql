-- Goals table for targets and quotas
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- NULL = team-wide
  created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- revenue, deals_won, deals_created, contacts_created, activities_logged
  target_value NUMERIC(15,2) NOT NULL,
  period TEXT NOT NULL,  -- monthly, quarterly, yearly
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_team ON goals(team_id, is_active, start_date, end_date);
CREATE INDEX idx_goals_account ON goals(account_id, team_id, is_active);

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read goals"
  ON goals FOR SELECT
  USING (team_id = (current_setting('app.current_team_id', true))::uuid);

CREATE POLICY "System can manage goals"
  ON goals FOR ALL
  WITH CHECK (true);

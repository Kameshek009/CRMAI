-- Visibility Groups: separate from Permission Sets
-- Controls WHAT records a user can SEE (vs permissions = what they can DO)

CREATE TABLE IF NOT EXISTS visibility_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visibility_groups_team ON visibility_groups(team_id);

CREATE TABLE IF NOT EXISTS visibility_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES visibility_groups(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_vg_members_group ON visibility_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_vg_members_account ON visibility_group_members(account_id);

-- Add visibility_group_id to main CRM entities
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS visibility_group_id UUID REFERENCES visibility_groups(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS visibility_group_id UUID REFERENCES visibility_groups(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS visibility_group_id UUID REFERENCES visibility_groups(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS visibility_group_id UUID REFERENCES visibility_groups(id) ON DELETE SET NULL;

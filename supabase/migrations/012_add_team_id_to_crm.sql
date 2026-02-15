-- ============================================================================
-- Migration 012: Add team_id to CRM tables + create_team_with_defaults()
-- ============================================================================

-- ============================================================================
-- Add team_id columns to CRM tables
-- ============================================================================

ALTER TABLE companies ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE deal_stages ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE crm_tasks ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE crm_activities ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE crm_notes ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add assigned_to for tasks and deals
ALTER TABLE crm_tasks ADD COLUMN assigned_to UUID REFERENCES accounts(id);
ALTER TABLE deals ADD COLUMN assigned_to UUID REFERENCES accounts(id);

-- Add current_team_id to accounts
ALTER TABLE accounts ADD COLUMN current_team_id UUID REFERENCES teams(id);

-- ============================================================================
-- Indexes on team_id
-- ============================================================================

CREATE INDEX idx_companies_team ON companies(team_id);
CREATE INDEX idx_contacts_team ON contacts(team_id);
CREATE INDEX idx_deal_stages_team ON deal_stages(team_id);
CREATE INDEX idx_deals_team ON deals(team_id);
CREATE INDEX idx_crm_tasks_team ON crm_tasks(team_id);
CREATE INDEX idx_crm_activities_team ON crm_activities(team_id);
CREATE INDEX idx_crm_notes_team ON crm_notes(team_id);
CREATE INDEX idx_crm_tasks_assigned ON crm_tasks(assigned_to);
CREATE INDEX idx_deals_assigned ON deals(assigned_to);

-- ============================================================================
-- create_team_with_defaults(p_account_id, p_team_name)
-- Creates a team with Director + AI system roles, adds the creator as Director
-- ============================================================================

CREATE OR REPLACE FUNCTION create_team_with_defaults(
  p_account_id UUID,
  p_team_name TEXT DEFAULT 'My Team'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
  v_director_role_id UUID;
  v_ai_role_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate a unique slug from name
  v_slug := lower(regexp_replace(p_team_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6);

  -- Create team
  INSERT INTO teams (name, slug, owner_account_id)
  VALUES (p_team_name, v_slug, p_account_id)
  RETURNING id INTO v_team_id;

  -- Create Director role (system, highest priority)
  INSERT INTO team_roles (team_id, name, color, priority, is_system, permissions)
  VALUES (
    v_team_id, 'Director', '#ef4444', 1000, true,
    '{
      "contacts": { "read": true, "create": true, "update": true, "delete": true },
      "companies": { "read": true, "create": true, "update": true, "delete": true },
      "deals": { "read": true, "create": true, "update": true, "delete": true },
      "tasks": { "read": true, "create": true, "update": true, "delete": true },
      "pipeline": { "read": true, "manage": true },
      "analytics": { "read": true },
      "team_settings": { "read": true, "manage": true },
      "ai_chat": { "allowed": true }
    }'::jsonb
  )
  RETURNING id INTO v_director_role_id;

  -- Create AI role (system)
  INSERT INTO team_roles (team_id, name, color, priority, is_system, permissions)
  VALUES (
    v_team_id, 'AI', '#8b5cf6', 900, true,
    '{
      "contacts": { "read": true, "create": true, "update": true, "delete": false },
      "companies": { "read": true, "create": true, "update": false, "delete": false },
      "deals": { "read": true, "create": true, "update": true, "delete": false },
      "tasks": { "read": true, "create": true, "update": true, "delete": false },
      "pipeline": { "read": true, "manage": false },
      "analytics": { "read": true },
      "team_settings": { "read": false, "manage": false },
      "ai_chat": { "allowed": true }
    }'::jsonb
  )
  RETURNING id INTO v_ai_role_id;

  -- Create default Member role
  INSERT INTO team_roles (team_id, name, color, priority, is_system, permissions)
  VALUES (
    v_team_id, 'Member', '#3b82f6', 500, false,
    '{
      "contacts": { "read": true, "create": true, "update": true, "delete": false },
      "companies": { "read": true, "create": true, "update": false, "delete": false },
      "deals": { "read": true, "create": true, "update": true, "delete": false },
      "tasks": { "read": true, "create": true, "update": true, "delete": false },
      "pipeline": { "read": true, "manage": false },
      "analytics": { "read": true },
      "team_settings": { "read": false, "manage": false },
      "ai_chat": { "allowed": true }
    }'::jsonb
  );

  -- Add owner as Director member
  INSERT INTO team_members (team_id, account_id, role_id, is_director, status)
  VALUES (v_team_id, p_account_id, v_director_role_id, true, 'active');

  -- Create AI permissions with defaults
  INSERT INTO ai_permissions (team_id)
  VALUES (v_team_id);

  -- Set as current team for the account
  UPDATE accounts SET current_team_id = v_team_id WHERE id = p_account_id;

  RETURN v_team_id;
END;
$$;

-- ============================================================================
-- Migrate existing data: create personal teams for all accounts
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_team_id UUID;
BEGIN
  FOR r IN SELECT id FROM accounts WHERE current_team_id IS NULL
  LOOP
    v_team_id := create_team_with_defaults(r.id, 'Personal');

    -- Update all existing CRM data to belong to this team
    UPDATE companies SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
    UPDATE contacts SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
    UPDATE deal_stages SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
    UPDATE deals SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
    UPDATE crm_tasks SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
    UPDATE crm_activities SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
    UPDATE crm_notes SET team_id = v_team_id WHERE account_id = r.id AND team_id IS NULL;
  END LOOP;
END;
$$;

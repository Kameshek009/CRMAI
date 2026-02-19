-- ============================================================================
-- Migration 022: Hybrid Roles
-- Add fixed_role column to team_members for Free/Pro tiers.
-- Max/Enterprise continue using custom team_roles with full permissions.
-- ============================================================================

-- Add fixed_role column: 'owner', 'admin', 'member', 'viewer'
ALTER TABLE team_members ADD COLUMN fixed_role TEXT NOT NULL DEFAULT 'member';

-- Set directors to 'owner'
UPDATE team_members SET fixed_role = 'owner' WHERE is_director = true;

-- Index for fast lookups
CREATE INDEX idx_team_members_fixed_role ON team_members(team_id, fixed_role);

-- ============================================================================
-- Update create_team_with_defaults to set fixed_role on director
-- ============================================================================

CREATE OR REPLACE FUNCTION create_team_with_defaults(
  p_account_id UUID,
  p_team_name TEXT DEFAULT 'My Workspace'
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

  -- Create Owner role (system, highest priority)
  INSERT INTO team_roles (team_id, name, color, priority, is_system, permissions)
  VALUES (
    v_team_id, 'Owner', '#ef4444', 1000, true,
    '{
      "contacts": { "read": true, "create": true, "update": true, "delete": true },
      "companies": { "read": true, "create": true, "update": true, "delete": true },
      "deals": { "read": true, "create": true, "update": true, "delete": true },
      "tasks": { "read": true, "create": true, "update": true, "delete": true },
      "leads": { "read": true, "create": true, "update": true, "delete": true },
      "call_logs": { "read": true, "create": true, "update": true, "delete": true },
      "notes": { "read": true, "create": true, "update": true, "delete": true },
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
      "leads": { "read": true, "create": true, "update": true, "delete": false },
      "call_logs": { "read": true, "create": true, "update": true, "delete": false },
      "notes": { "read": true, "create": true, "update": true, "delete": false },
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
      "companies": { "read": true, "create": true, "update": true, "delete": false },
      "deals": { "read": true, "create": true, "update": true, "delete": false },
      "tasks": { "read": true, "create": true, "update": true, "delete": false },
      "leads": { "read": true, "create": true, "update": true, "delete": false },
      "call_logs": { "read": true, "create": true, "update": true, "delete": false },
      "notes": { "read": true, "create": true, "update": true, "delete": false },
      "pipeline": { "read": true, "manage": false },
      "analytics": { "read": true },
      "team_settings": { "read": false, "manage": false },
      "ai_chat": { "allowed": true }
    }'::jsonb
  );

  -- Add owner as Director member with fixed_role = 'owner'
  INSERT INTO team_members (team_id, account_id, role_id, is_director, status, fixed_role)
  VALUES (v_team_id, p_account_id, v_director_role_id, true, 'active', 'owner');

  -- Create AI permissions with defaults
  INSERT INTO ai_permissions (team_id)
  VALUES (v_team_id);

  -- Set as current team for the account
  UPDATE accounts SET current_team_id = v_team_id WHERE id = p_account_id;

  RETURN v_team_id;
END;
$$;

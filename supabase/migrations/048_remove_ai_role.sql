-- ============================================================================
-- Migration 048: Remove AI system role from team_roles
-- The AI role was never assigned to team members and is redundant since
-- AI permissions are managed via the ai_permissions table and ai_chat
-- permission flag on each role.
-- ============================================================================

-- Delete all AI system roles
DELETE FROM team_roles WHERE name = 'AI' AND is_system = true;

-- ============================================================================
-- Update create_team_with_defaults to no longer create AI role
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
      "notes": { "read": true, "create": true, "update": true, "delete": true },
      "pipeline": { "read": true, "manage": true },
      "analytics": { "read": true },
      "team_settings": { "read": true, "manage": true },
      "ai_chat": { "allowed": true }
    }'::jsonb
  )
  RETURNING id INTO v_director_role_id;

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

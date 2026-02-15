-- ============================================================================
-- Migration 011: Create Team Tables
-- Team-based collaboration system for Nexxus CRM
-- ============================================================================

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE team_member_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE team_invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE team_connection_status AS ENUM ('pending', 'accepted', 'rejected');

-- ============================================================================
-- Teams
-- ============================================================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 12),
  max_members INTEGER NOT NULL DEFAULT 3,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_owner ON teams(owner_account_id);
CREATE INDEX idx_teams_invite_code ON teams(invite_code);

-- ============================================================================
-- Team Roles
-- ============================================================================

CREATE TABLE team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  priority INTEGER NOT NULL DEFAULT 100,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_roles_team ON team_roles(team_id);
CREATE UNIQUE INDEX idx_team_roles_name ON team_roles(team_id, name);

-- ============================================================================
-- Team Members
-- ============================================================================

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES team_roles(id) ON DELETE RESTRICT,
  is_director BOOLEAN NOT NULL DEFAULT false,
  status team_member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_account ON team_members(account_id);
CREATE UNIQUE INDEX idx_team_members_unique ON team_members(team_id, account_id);

-- ============================================================================
-- Team Invites
-- ============================================================================

CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  role_id UUID REFERENCES team_roles(id) ON DELETE SET NULL,
  invited_email TEXT,
  invited_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status team_invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invites_team ON team_invites(team_id);
CREATE INDEX idx_team_invites_code ON team_invites(code);

-- ============================================================================
-- Team Connections
-- ============================================================================

CREATE TABLE team_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  connection_code TEXT,
  shared_resources JSONB NOT NULL DEFAULT '{}',
  status team_connection_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_connections_requester ON team_connections(requester_team_id);
CREATE INDEX idx_team_connections_target ON team_connections(target_team_id);

-- ============================================================================
-- AI Permissions
-- ============================================================================

CREATE TABLE ai_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  permission_level INTEGER NOT NULL DEFAULT 50 CHECK (permission_level >= 0 AND permission_level <= 100),
  can_create_contacts BOOLEAN NOT NULL DEFAULT true,
  can_create_deals BOOLEAN NOT NULL DEFAULT true,
  can_create_tasks BOOLEAN NOT NULL DEFAULT true,
  max_task_priority INTEGER NOT NULL DEFAULT 3,
  max_assignable_role_priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ai_permissions_team ON ai_permissions(team_id);

-- ============================================================================
-- Auto-update triggers
-- ============================================================================

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_roles_updated_at BEFORE UPDATE ON team_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_connections_updated_at BEFORE UPDATE ON team_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_permissions_updated_at BEFORE UPDATE ON ai_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Enable RLS (bypass via service role)
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Enable Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE team_members;

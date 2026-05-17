-- Migration 049: API keys for public REST API
--
-- Bearer-token authentication for external integrators. Workflow:
--   1. User creates a key via admin UI/endpoint — plaintext shown ONCE.
--   2. Server stores sha256(plaintext); plaintext never persisted.
--   3. External caller sends Authorization: Bearer nxk_live_<random>.
--   4. Server hashes incoming token and looks up the row;
--      checks scopes/expiry/revocation.
--
-- Scopes are free-form strings; conventions: `<resource>:<action>`,
-- supports `:*` wildcard (e.g. `contacts:*`) and the literal `*`.

BEGIN;

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_by_clerk_user_id TEXT,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_used_ip TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_team_active
  ON api_keys (team_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_hash_active
  ON api_keys (key_hash)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: service_role (used by API routes) bypasses RLS.
-- No anon/authenticated policies — anon must NEVER read api_keys.

COMMIT;

-- Migration 050: OAuth token storage for Gmail / MS Graph / Google Calendar
--
-- One row per (team, provider, provider_user_id) — the user's Google/MS
-- account connected to a Nexxus workspace. Access and refresh tokens are
-- stored encrypted at the application layer (AES-256-GCM) because Supabase
-- service_role bypasses RLS; column-level encryption protects against a
-- compromised service key being used to read raw tokens.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
    CREATE TYPE oauth_provider AS ENUM ('google', 'microsoft');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_team_provider
  ON oauth_tokens (team_id, provider);

DROP TRIGGER IF EXISTS trg_oauth_tokens_updated_at ON oauth_tokens;
CREATE TRIGGER trg_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

COMMIT;

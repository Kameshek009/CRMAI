-- Migration 061: telephony_settings table + call_logs provider fields
--
-- Adds:
--   1. `telephony_settings` table — per-team encrypted Twilio (or future
--      Mango) credentials. AES-256-GCM at rest via TOKEN_ENCRYPTION_KEY,
--      same pattern as oauth_tokens / whatsapp_settings.
--   2. `call_logs.provider` + `call_logs.provider_call_id` so each row can
--      be matched to a Twilio CallSid (or Mango call_id) for status
--      webhooks and recording URL updates.
--
-- This migration is purely additive — no data backfill needed. The
-- telephony feature stays dormant until the workspace owner saves
-- credentials in the integrations UI.

BEGIN;

DO $$ BEGIN
  CREATE TYPE telephony_provider AS ENUM ('twilio', 'mango');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS telephony_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  provider telephony_provider NOT NULL DEFAULT 'twilio',
  -- Twilio Account SID is non-secret but we still treat the pair as one
  -- credential bundle for symmetry with the encrypted auth token.
  account_sid TEXT NOT NULL,
  auth_token_encrypted TEXT NOT NULL,
  /* Caller-ID number (E.164). Outbound calls dial FROM this. */
  from_number TEXT NOT NULL,
  /* Optional API key SID/secret pair for fine-grained access (Twilio API Keys). */
  api_key_sid_encrypted TEXT,
  api_key_secret_encrypted TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telephony_settings_provider
  ON telephony_settings (provider);

DROP TRIGGER IF EXISTS trg_telephony_settings_updated_at ON telephony_settings;
CREATE TRIGGER trg_telephony_settings_updated_at
  BEFORE UPDATE ON telephony_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE telephony_settings ENABLE ROW LEVEL SECURITY;

-- 2) call_logs provider linking
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS provider_call_id TEXT;

CREATE INDEX IF NOT EXISTS idx_call_logs_provider_call_id
  ON call_logs (provider_call_id)
  WHERE provider_call_id IS NOT NULL;

COMMIT;

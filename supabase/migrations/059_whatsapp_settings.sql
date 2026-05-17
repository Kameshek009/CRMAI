-- Migration 059: dedicated whatsapp_settings table
--
-- Replaces the `teams.settings.whatsapp` jsonb blob with a proper table that:
--   - stores the access_token & app_secret encrypted at rest (AES-256-GCM)
--   - indexes phone_number_id UNIQUE for O(1) webhook routing (was full scan)
--   - tracks connection origin: 'byo' (customer brings own Meta App) vs
--     'embedded_signup' (provisioned via our Meta App)
--
-- Backfill: copy any existing teams.settings.whatsapp rows into the new
-- table. Encryption is done at the application layer, so we INSERT a
-- sentinel `MIGRATION_PLAINTEXT:` prefix on access_token to mark rows that
-- still need to be re-encrypted by a one-shot job; the webhook + send
-- helpers refuse to use such rows until they're re-saved through the API.
--
-- The old `teams.settings.whatsapp` blob is left in place — we'll drop the
-- key in a follow-up migration once we've verified the new table for a
-- release cycle.

BEGIN;

DO $$ BEGIN
  CREATE TYPE whatsapp_connection_origin AS ENUM ('byo', 'embedded_signup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  app_secret_encrypted TEXT,
  webhook_verify_token TEXT NOT NULL,
  origin whatsapp_connection_origin NOT NULL DEFAULT 'byo',
  display_name TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_settings_phone_number_id
  ON whatsapp_settings (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_waba_id
  ON whatsapp_settings (waba_id);

DROP TRIGGER IF EXISTS trg_whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER trg_whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Backfill: pull whatsapp blocks out of teams.settings.
-- The sentinel prefix `MIGRATION_PLAINTEXT:` marks rows whose access_token
-- has not yet been encrypted; application code refuses to use such rows
-- (forces a manual re-save). This avoids accidentally double-encrypting and
-- avoids decrypting a token that was never encrypted.
INSERT INTO whatsapp_settings (
  team_id, phone_number_id, waba_id, access_token_encrypted,
  webhook_verify_token, origin, is_connected, metadata
)
SELECT
  t.id AS team_id,
  (t.settings->'whatsapp'->>'phone_number_id') AS phone_number_id,
  COALESCE(t.settings->'whatsapp'->>'waba_id', '') AS waba_id,
  'MIGRATION_PLAINTEXT:' || (t.settings->'whatsapp'->>'access_token') AS access_token_encrypted,
  COALESCE(
    t.settings->'whatsapp'->>'webhook_verify_token',
    encode(gen_random_bytes(16), 'hex')
  ) AS webhook_verify_token,
  'byo'::whatsapp_connection_origin AS origin,
  COALESCE((t.settings->'whatsapp'->>'is_connected')::boolean, false) AS is_connected,
  jsonb_build_object('migrated_from_settings', true) AS metadata
FROM teams t
WHERE t.settings->'whatsapp'->>'phone_number_id' IS NOT NULL
  AND t.settings->'whatsapp'->>'access_token' IS NOT NULL
ON CONFLICT (team_id) DO NOTHING;

COMMIT;

-- Migration 053: Store encrypted webhook secret for outbound signing
--
-- The outbound dispatcher must sign each delivery with HMAC-SHA256(secret, body),
-- so it needs the plaintext secret — a one-way hash is unusable for signing.
-- Store the secret encrypted with AES-256-GCM (same scheme as oauth_tokens), so
-- a leaked DB still cannot forge signatures without TOKEN_ENCRYPTION_KEY.
--
-- secret_hash from migration 052 is kept (nullable) so any rows inserted by
-- hand survive; new code reads/writes secret_encrypted only.

BEGIN;

ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS secret_encrypted TEXT;
ALTER TABLE webhook_endpoints ALTER COLUMN secret_hash DROP NOT NULL;

COMMIT;

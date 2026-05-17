-- Migration 055: GDPR self-service (right to erasure + portability + consent)
--
-- Phase 2 wave A feature 1. Adds the columns and audit table needed to let
-- users request account deletion (Art. 17), download their data (Art. 20),
-- and record cookie consent (ePrivacy + Art. 6/7) without round-tripping
-- through support. Until this migration the only path was a soft-deactivate
-- (032) which preserves data forever; that does not meet erasure obligations.
--
-- 30-day grace period is implemented as a deletion_requested_at timestamp +
-- a daily cron (api/cron/purge-deleted-accounts) that hard-deletes rows older
-- than the threshold. We do not store the threshold here — the cron owns it
-- so we can tune it without a migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- accounts: deletion request + cookie consent snapshot
-- ---------------------------------------------------------------------------

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS cookie_consent JSONB;

-- Partial index: only rows with a pending deletion are interesting to the
-- purge cron. Keeps the index tiny since the overwhelming majority of
-- accounts will never have this set.
CREATE INDEX IF NOT EXISTS idx_accounts_deletion_requested
  ON accounts (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;

COMMENT ON COLUMN accounts.deletion_requested_at IS
  'When set, account is scheduled for hard delete. Purge cron deletes rows older than the grace period. NULL means active or only soft-deactivated.';
COMMENT ON COLUMN accounts.cookie_consent IS
  'Snapshot of last cookie consent decision: {essential, analytics, marketing, ts, version}. Mirrors the nexxus_consent cookie so we have a server-side record for compliance audits.';

-- ---------------------------------------------------------------------------
-- gdpr_export_log: audit + rate-limit for data exports
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gdpr_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  file_size_bytes INTEGER,
  error TEXT
);

-- The export endpoint enforces "1 successful export per 24h" by checking
-- whether any row exists for this account with exported_at > NOW()-24h AND
-- error IS NULL. Index makes that lookup cheap.
CREATE INDEX IF NOT EXISTS idx_gdpr_export_log_account_time
  ON gdpr_export_log (account_id, exported_at DESC);

COMMENT ON TABLE gdpr_export_log IS
  'One row per export attempt. Used both as audit trail and to rate-limit exports (Art. 12 forbids unreasonable charges/effort but lets the controller refuse manifestly excessive requests).';

ALTER TABLE gdpr_export_log ENABLE ROW LEVEL SECURITY;

COMMIT;

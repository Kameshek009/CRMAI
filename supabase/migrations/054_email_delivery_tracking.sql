-- Migration 054: track real email delivery state from Resend
--
-- Before this migration, email_communications was a write-only log of "we
-- intended to send X" — no provider, no message id, no delivery confirmation.
-- Resend integration (Phase 1 feature 3) requires:
--   * tying our row to the upstream provider message via provider_message_id
--   * recording delivery / bounce / open / click timestamps received via
--     the Resend webhook
--   * a queued/sending state so we can tell "we tried but Resend was down"
--     apart from "we never tried"

BEGIN;

-- New enum values for email_status. ADD VALUE IF NOT EXISTS is idempotent.
ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'bounced';
ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'complained';

COMMIT;

-- Column additions in a second transaction: ALTER TYPE ADD VALUE cannot run
-- in the same transaction as a later use of the new value, even though we
-- don't reference the new values in the ALTER TABLE below — separating keeps
-- the migration replay-safe.
BEGIN;

ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Lookup by provider_message_id is the hot path for the inbound Resend
-- webhook handler; without an index it'd be a sequential scan per event.
-- Partial because rows from before Resend integration have NULL here.
CREATE INDEX IF NOT EXISTS idx_email_comms_provider_message_id
  ON email_communications (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

COMMIT;

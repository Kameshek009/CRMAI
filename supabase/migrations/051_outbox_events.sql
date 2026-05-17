-- Migration 051: Outbox events for at-least-once event delivery
--
-- Pattern: when a domain action commits (contact created, deal won, ...),
-- write a row here in the same transaction. A background dispatcher
-- (Vercel Cron / Inngest) picks pending rows and produces side-effects
-- like webhook delivery, automation runs, analytics, etc.
--
-- Why outbox: guarantees that "DB committed" implies "event will be
-- delivered at least once" without distributed-transaction gymnastics.

BEGIN;

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Dispatch state
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON outbox_events (next_attempt_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_team_event
  ON outbox_events (team_id, event_type, occurred_at DESC);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

COMMIT;

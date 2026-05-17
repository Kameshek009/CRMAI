-- Migration 052: Webhook endpoints and deliveries
--
-- webhook_endpoints — user-registered URLs subscribed to event types.
-- webhook_deliveries — audit log of each delivery attempt (one row per attempt).
--
-- Signing: each endpoint has a secret; deliveries include an
-- `X-Nexxus-Signature: sha256=<hex>` header computed as
-- HMAC-SHA256(secret, raw_body).

BEGIN;

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT NOT NULL,
  -- Signing secret is shown to the user once on creation and stored hashed.
  -- The HMAC verification on the receiving side uses the plaintext the user kept;
  -- we keep only the hash so a leaked DB cannot forge signatures.
  secret_hash TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{*}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status TEXT,
  created_by_clerk_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_team_active
  ON webhook_endpoints (team_id)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_webhook_endpoints_updated_at ON webhook_endpoints;
CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  outbox_event_id UUID REFERENCES outbox_events(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  http_status INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON webhook_deliveries (endpoint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event
  ON webhook_deliveries (outbox_event_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

COMMIT;

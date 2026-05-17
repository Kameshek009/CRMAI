-- Migration 058: calendar_events for Google Calendar two-way sync
--
-- Two write paths land in this table:
--   1. Inbound webhook from Google (events.list via syncToken delta) — for
--      events the user creates / edits in Google Calendar.
--   2. CRM-side POST /api/crm/calendar/events — we INSERT here, then mirror
--      to Google via events.insert and stamp `provider_event_id`.
--
-- Foreign-key links to contacts / leads / deals are optional — we let users
-- attach a meeting to any combination, and an event can be unattached.

BEGIN;

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  provider_event_id TEXT,
  provider_calendar_id TEXT NOT NULL DEFAULT 'primary',
  title TEXT,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  attendees JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'confirmed',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_team_starts
  ON calendar_events (team_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_team_account
  ON calendar_events (team_id, account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact
  ON calendar_events (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead
  ON calendar_events (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_deal
  ON calendar_events (deal_id) WHERE deal_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

COMMIT;

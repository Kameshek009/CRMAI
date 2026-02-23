-- ============================================================================
-- Migration 041: Telephony + WhatsApp Cloud API
-- ============================================================================

-- 1) Add 'initiated' to call_log_status enum
ALTER TYPE call_log_status ADD VALUE IF NOT EXISTS 'initiated' BEFORE 'completed';

-- ============================================================================
-- 2) WhatsApp Messages
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE whatsapp_message_type AS ENUM ('text', 'template', 'image', 'document', 'audio', 'video', 'location', 'reaction');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  wa_message_id TEXT,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT,
  message_type whatsapp_message_type DEFAULT 'text',
  direction call_direction DEFAULT 'outbound',
  status whatsapp_message_status DEFAULT 'pending',
  template_name TEXT,
  template_params JSONB DEFAULT '[]',
  media_url TEXT,
  media_mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  is_deleted BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_team_id ON whatsapp_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_contact_id ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_lead_id ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_from ON whatsapp_messages(team_id, from_number);
CREATE INDEX IF NOT EXISTS idx_wa_messages_to ON whatsapp_messages(team_id, to_number);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created_at ON whatsapp_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_not_deleted ON whatsapp_messages(team_id, is_deleted) WHERE is_deleted = false;

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Service role full access on whatsapp_messages" ON whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 3) WhatsApp Webhook Idempotency
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on whatsapp_webhook_events" ON whatsapp_webhook_events;
CREATE POLICY "Service role full access on whatsapp_webhook_events" ON whatsapp_webhook_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 4) Enable realtime for whatsapp_messages
-- ============================================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

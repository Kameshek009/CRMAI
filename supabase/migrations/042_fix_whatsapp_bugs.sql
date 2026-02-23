-- 042: Fix WhatsApp-related bugs found in code review

-- 1. Add 'whatsapp' to activity_type enum (without it, activity logging fails)
DO $$ BEGIN
  ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'whatsapp';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Fix RLS policies: restrict to service_role only (was open to all roles)
DROP POLICY IF EXISTS "Service role full access on whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Service role full access on whatsapp_messages"
  ON whatsapp_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on whatsapp_webhook_events" ON whatsapp_webhook_events;
CREATE POLICY "Service role full access on whatsapp_webhook_events"
  ON whatsapp_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Add index on contacts.phone for findContactByPhone queries
CREATE INDEX IF NOT EXISTS idx_contacts_team_phone ON contacts(team_id, phone);

-- 4. Add updated_at to whatsapp_messages for status change tracking
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER set_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_messages_updated_at();

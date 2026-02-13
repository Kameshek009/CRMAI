-- Migration: Add desktop agent status tracking
-- This enables mobile/dashboard to know if the desktop agent is online
-- and what mode it's currently operating in.

-- Add desktop agent status columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_online BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_mode TEXT DEFAULT 'chat' CHECK (desktop_agent_mode IN ('chat', 'agent', 'auto'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_last_seen TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_version TEXT DEFAULT NULL;

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_accounts_desktop_agent_status
ON accounts (desktop_agent_online, desktop_agent_last_seen);

-- Create a function to automatically mark agent as offline if no heartbeat in 2 minutes
CREATE OR REPLACE FUNCTION check_desktop_agent_offline()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as offline if last_seen is more than 2 minutes ago
  IF NEW.desktop_agent_last_seen IS NOT NULL
     AND NEW.desktop_agent_last_seen < NOW() - INTERVAL '2 minutes' THEN
    NEW.desktop_agent_online := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add composite index for message ordering (optimization)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created
ON messages (chat_id, created_at);

-- Add index for filtering messages by device origin
CREATE INDEX IF NOT EXISTS idx_messages_device_origin
ON messages (device_origin) WHERE device_origin IS NOT NULL;

-- Grant permissions
GRANT SELECT, UPDATE ON accounts TO authenticated;
GRANT SELECT, UPDATE ON accounts TO service_role;

COMMENT ON COLUMN accounts.desktop_agent_online IS 'Whether the desktop agent is currently connected and online';
COMMENT ON COLUMN accounts.desktop_agent_mode IS 'Current operating mode of the desktop agent: chat, agent, or auto';
COMMENT ON COLUMN accounts.desktop_agent_last_seen IS 'Timestamp of the last heartbeat from the desktop agent';
COMMENT ON COLUMN accounts.desktop_agent_version IS 'Version of the desktop app for compatibility checks';

-- ============================================
-- Migration: 005_create_chats
-- Description: Create chat sync tables for cross-platform messaging
-- ============================================

-- ============================================
-- CHATS TABLE (Core chat entity)
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Metadata
  title TEXT,
  mode TEXT NOT NULL DEFAULT 'chat' CHECK (mode IN ('chat', 'agent', 'auto')),

  -- Vision Board Link (for agent mode)
  vision_board_id UUID,

  -- Sync Control
  device_origin TEXT,
  last_synced_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE (Chat messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,

  -- Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Rich Content (agent mode)
  metadata JSONB DEFAULT '{}',
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'plan', 'action', 'result', 'error')),

  -- Token tracking
  tokens_used INTEGER DEFAULT 0,

  -- Sync Control
  local_id TEXT,
  device_origin TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VISION_BOARDS TABLE (Agent task state)
-- ============================================
CREATE TABLE IF NOT EXISTS vision_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,

  -- Board Data
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed', 'cancelled')),
  board_data JSONB NOT NULL DEFAULT '{}',

  -- Progress tracking
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  current_phase TEXT,
  current_task TEXT,

  -- Sync
  device_origin TEXT,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- SYNC_LOG TABLE (Conflict resolution & audit)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chat', 'message', 'vision_board')),
  entity_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Sync Details
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  device_id TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'web')),

  -- Change tracking
  previous_data JSONB,
  new_data JSONB,

  -- Conflict Resolution
  vector_clock JSONB DEFAULT '{}',
  conflict_detected BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_strategy TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chats_account ON chats(account_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_not_deleted ON chats(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vision_boards_account ON vision_boards(account_id);
CREATE INDEX IF NOT EXISTS idx_vision_boards_chat ON vision_boards(chat_id);
CREATE INDEX IF NOT EXISTS idx_vision_boards_status ON vision_boards(status) WHERE status IN ('active', 'pending');
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_account ON sync_log(account_id);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vision_boards_updated_at
  BEFORE UPDATE ON vision_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS
-- These policies ensure users can only access their own data

-- Chats: Users can only access their own chats
CREATE POLICY chats_select_policy ON chats
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY chats_insert_policy ON chats
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY chats_update_policy ON chats
  FOR UPDATE USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY chats_delete_policy ON chats
  FOR DELETE USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Messages: Users can access messages in their chats
CREATE POLICY messages_select_policy ON messages
  FOR SELECT USING (
    chat_id IN (
      SELECT c.id FROM chats c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY messages_insert_policy ON messages
  FOR INSERT WITH CHECK (
    chat_id IN (
      SELECT c.id FROM chats c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY messages_update_policy ON messages
  FOR UPDATE USING (
    chat_id IN (
      SELECT c.id FROM chats c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY messages_delete_policy ON messages
  FOR DELETE USING (
    chat_id IN (
      SELECT c.id FROM chats c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Vision Boards: Users can only access their own boards
CREATE POLICY vision_boards_select_policy ON vision_boards
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY vision_boards_insert_policy ON vision_boards
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY vision_boards_update_policy ON vision_boards
  FOR UPDATE USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY vision_boards_delete_policy ON vision_boards
  FOR DELETE USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Sync Log: Users can only access their own sync logs
CREATE POLICY sync_log_all_policy ON sync_log
  FOR ALL USING (
    account_id IN (
      SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE vision_boards;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to soft delete a chat (marks as deleted, doesn't remove)
CREATE OR REPLACE FUNCTION soft_delete_chat(chat_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chats
  SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW()
  WHERE id = chat_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to restore a soft-deleted chat
CREATE OR REPLACE FUNCTION restore_chat(chat_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chats
  SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW()
  WHERE id = chat_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to generate chat title from first message
CREATE OR REPLACE FUNCTION generate_chat_title(chat_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  first_message TEXT;
  generated_title TEXT;
BEGIN
  SELECT content INTO first_message
  FROM messages
  WHERE chat_id = chat_uuid AND role = 'user'
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_message IS NULL THEN
    RETURN 'New Chat';
  END IF;

  -- Truncate to 50 chars and add ellipsis if needed
  IF LENGTH(first_message) > 50 THEN
    generated_title := LEFT(first_message, 47) || '...';
  ELSE
    generated_title := first_message;
  END IF;

  RETURN generated_title;
END;
$$ LANGUAGE plpgsql;

-- Function to get chat with message count
CREATE OR REPLACE FUNCTION get_chat_with_stats(chat_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  mode TEXT,
  message_count BIGINT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    COALESCE(c.title, generate_chat_title(c.id)) as title,
    c.mode,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    c.created_at,
    c.updated_at
  FROM chats c
  LEFT JOIN messages m ON m.chat_id = c.id
  WHERE c.id = chat_uuid AND c.is_deleted = FALSE
  GROUP BY c.id, c.title, c.mode, c.created_at, c.updated_at;
END;
$$ LANGUAGE plpgsql;

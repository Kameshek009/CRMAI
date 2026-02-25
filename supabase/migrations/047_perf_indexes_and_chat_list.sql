-- Migration 047: Performance indexes + chat list function
--
-- 1. get_chat_list() — returns chats with last message preview in a single query
-- 2. Missing indexes for sequence processor and analytics

-- ─── Chat list function ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_chat_list(p_account_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  title TEXT,
  mode TEXT,
  updated_at TIMESTAMPTZ,
  message_count BIGINT,
  last_message_preview TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.title,
    c.mode,
    c.updated_at,
    COALESCE(stats.cnt, 0)              AS message_count,
    LEFT(last_msg.content, 100)         AS last_message_preview
  FROM chats c
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
      FROM messages m
     WHERE m.chat_id = c.id
  ) stats ON true
  LEFT JOIN LATERAL (
    SELECT m.content
      FROM messages m
     WHERE m.chat_id = c.id
     ORDER BY m.created_at DESC
     LIMIT 1
  ) last_msg ON true
  WHERE c.account_id = p_account_id
    AND c.is_deleted = false
  ORDER BY c.updated_at DESC
  LIMIT p_limit;
$$;

-- ─── Performance indexes ───────────────────────────────────────

-- Messages: speed up chat_id lookups (chat list, detail, stream polling)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created
  ON messages(chat_id, created_at DESC);

-- Email sequence enrollments: composite index for cron processor query
CREATE INDEX IF NOT EXISTS idx_enrollments_active_next_send
  ON email_sequence_enrollments(status, next_send_at)
  WHERE status = 'active';

-- Email sequence steps: speed up sequence_id + position lookups
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq_position
  ON email_sequence_steps(sequence_id, position);

-- Contacts: speed up analytics engagement_score queries
CREATE INDEX IF NOT EXISTS idx_contacts_team_status_engagement
  ON contacts(team_id, status, engagement_score)
  WHERE is_deleted = false;

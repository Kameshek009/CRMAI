-- ============================================
-- Migration: 007_create_chats_with_user_view
-- Description: Create a view to show chats with user information
-- ============================================

-- Drop the view if it exists (for re-running migrations)
DROP VIEW IF EXISTS chats_with_user;

-- Create a view that joins chats with account information
-- Using SECURITY INVOKER so the view respects RLS policies
CREATE VIEW chats_with_user
WITH (security_invoker = true)
AS
SELECT
  c.id AS chat_id,
  c.account_id,
  a.name AS user_name,
  a.email AS user_email,
  c.title,
  c.mode,
  c.device_origin,
  c.is_deleted,
  c.created_at,
  c.updated_at,
  c.last_synced_at,
  (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) AS message_count,
  (SELECT content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
FROM chats c
LEFT JOIN accounts a ON c.account_id = a.id
ORDER BY c.updated_at DESC;

-- Add comment for documentation
COMMENT ON VIEW chats_with_user IS 'View showing all chats with associated user account information (name, email). Uses SECURITY INVOKER to respect RLS.';

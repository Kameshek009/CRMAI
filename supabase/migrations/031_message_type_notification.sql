-- Add 'notification' to allowed message_type values
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'plan', 'action', 'result', 'error', 'notification'));

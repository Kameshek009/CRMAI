-- Atomic token increment function
-- Prevents race conditions when multiple requests try to update tokens simultaneously
-- Returns the new tokens_used and token_limit, or null if limit would be exceeded

CREATE OR REPLACE FUNCTION increment_team_tokens(
  p_team_id UUID,
  p_tokens INTEGER,
  p_daily_tokens INTEGER DEFAULT NULL,
  p_new_day_start TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  new_tokens_used INTEGER,
  new_weekly_tokens_used INTEGER,
  token_limit INTEGER,
  allowed BOOLEAN
) AS $$
DECLARE
  v_team RECORD;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT t.tokens_used, t.token_limit, t.weekly_tokens_used
  INTO v_team
  FROM teams t
  WHERE t.id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, false;
    RETURN;
  END IF;

  -- Check if adding tokens would exceed the limit
  IF v_team.tokens_used + p_tokens > v_team.token_limit THEN
    RETURN QUERY SELECT v_team.tokens_used, v_team.weekly_tokens_used, v_team.token_limit, false;
    RETURN;
  END IF;

  -- Atomic update
  IF p_daily_tokens IS NOT NULL AND p_new_day_start IS NOT NULL THEN
    UPDATE teams SET
      tokens_used = tokens_used + p_tokens,
      weekly_tokens_used = p_daily_tokens,
      week_start_date = p_new_day_start
    WHERE id = p_team_id;
  ELSE
    UPDATE teams SET
      tokens_used = tokens_used + p_tokens
    WHERE id = p_team_id;
  END IF;

  RETURN QUERY SELECT
    v_team.tokens_used + p_tokens,
    COALESCE(p_daily_tokens, v_team.weekly_tokens_used),
    v_team.token_limit,
    true;
END;
$$ LANGUAGE plpgsql;

-- Migration 046: Atomic seat_count sync function
--
-- Replaces non-atomic read-then-write pattern in join/kick routes.
-- Counts active team_members and updates teams.seat_count in one statement.

CREATE OR REPLACE FUNCTION sync_seat_count(p_team_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
    FROM team_members
   WHERE team_id = p_team_id
     AND status = 'active';

  v_count := GREATEST(v_count, 1);

  UPDATE teams
     SET seat_count = v_count
   WHERE id = p_team_id;

  RETURN v_count;
END;
$$;

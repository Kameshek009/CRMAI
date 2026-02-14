-- ============================================================================
-- Migration: Change token reset from weekly (7 days) to daily (24 hours)
-- ============================================================================
-- Previously: weekly_tokens_used reset every 7 days
-- Now: weekly_tokens_used resets every 24 hours (daily cap)
-- The column name stays the same (weekly_tokens_used / week_start_date)
-- to avoid breaking existing code, but semantically it's now daily.
-- ============================================================================

-- Update the reset function to use 24 hours instead of 7 days
CREATE OR REPLACE FUNCTION reset_weekly_tokens_if_needed()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if 24 hours have passed since the daily period start
    IF NEW.week_start_date + INTERVAL '24 hours' < NOW() THEN
        NEW.weekly_tokens_used := 0;
        NEW.week_start_date := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update comments to reflect daily semantics
COMMENT ON COLUMN accounts.weekly_tokens_used IS 'Tokens used in current day (resets every 24 hours)';
COMMENT ON COLUMN accounts.week_start_date IS 'Start of current daily tracking period (24h cycle)';

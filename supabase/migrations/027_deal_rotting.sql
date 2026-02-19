-- Deal rotting: per-stage configurable inactivity threshold (days)
ALTER TABLE deal_stages ADD COLUMN IF NOT EXISTS rotting_days INTEGER;

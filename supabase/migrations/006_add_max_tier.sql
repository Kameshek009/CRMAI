-- ============================================
-- Migration: 006_add_max_tier
-- Description: Add 'max' tier to subscription_tier enum
-- ============================================

-- Add 'max' value to the subscription_tier enum
-- Note: In PostgreSQL, you can't easily reorder enum values,
-- so 'max' will be added at the end
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'max';

-- Update token limits for the max tier
-- (This is informational - actual limits are in application code)
COMMENT ON TYPE subscription_tier IS 'Subscription tiers: free (1M tokens), pro (10M tokens), max (100M tokens), enterprise (credit-based)';

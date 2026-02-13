-- ============================================================================
-- Serotonin Dashboard - Payment System Migration
-- ============================================================================
-- This migration adds support for the new tier structure:
--   Free: 1M tokens/month ($0)
--   Pro: 10M tokens/month ($20/mo subscription)
--   Max: 100M tokens/month ($100/mo subscription)
--   Enterprise: Credit-based ($1/1M tokens, packages: 20M, 50M, 100M, 500M)
--
-- Key Features:
-- - Weekly usage caps (monthly_limit / 4) to prevent burst usage
-- - Token credits system for enterprise one-time purchases
-- - Stripe payment method storage for saved cards
-- ============================================================================

-- Add 'max' tier to subscription_tier enum
-- PostgreSQL doesn't allow ALTER TYPE ... ADD VALUE in a transaction block,
-- so we need to do this outside the transaction or use a workaround
DO $$
BEGIN
    -- Check if 'max' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'max'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_tier')
    ) THEN
        ALTER TYPE subscription_tier ADD VALUE 'max' AFTER 'pro';
    END IF;
END $$;

-- ============================================================================
-- Add new columns to accounts table
-- ============================================================================

-- Weekly usage tracking
-- Resets every 7 days within the billing cycle
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS weekly_tokens_used INTEGER NOT NULL DEFAULT 0;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS week_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Token credits for enterprise tier (one-time purchases)
-- Credits don't reset monthly - they're consumed until depleted
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS token_credits INTEGER NOT NULL DEFAULT 0;

-- Stripe payment method ID for saved cards
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- ============================================================================
-- Create function to reset weekly tokens
-- ============================================================================
-- This should be called by a cron job or when checking usage

CREATE OR REPLACE FUNCTION reset_weekly_tokens_if_needed()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a week has passed since week_start_date
    IF NEW.week_start_date + INTERVAL '7 days' < NOW() THEN
        NEW.weekly_tokens_used := 0;
        NEW.week_start_date := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-reset weekly tokens on any update
DROP TRIGGER IF EXISTS reset_weekly_tokens_trigger ON accounts;
CREATE TRIGGER reset_weekly_tokens_trigger
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION reset_weekly_tokens_if_needed();

-- ============================================================================
-- Create tier_limits reference table
-- ============================================================================
-- This table stores the configuration for each tier
-- Making it easy to adjust limits without code changes

CREATE TABLE IF NOT EXISTS tier_limits (
    tier subscription_tier PRIMARY KEY,
    monthly_token_limit BIGINT NOT NULL,
    weekly_token_limit BIGINT GENERATED ALWAYS AS (monthly_token_limit / 4) STORED,
    price_monthly_cents INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tier configurations
INSERT INTO tier_limits (tier, monthly_token_limit, price_monthly_cents, features) VALUES
    ('free', 1000000, 0, '["Basic usage", "Community support", "7-day history"]'::jsonb),
    ('pro', 10000000, 2000, '["Priority support", "30-day history", "API access", "Advanced analytics"]'::jsonb),
    ('max', 100000000, 10000, '["Dedicated support", "Unlimited history", "Custom integrations", "SLA guarantee"]'::jsonb),
    ('enterprise', 0, 0, '["Volume pricing", "Custom contracts", "Dedicated infrastructure", "24/7 support"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
    monthly_token_limit = EXCLUDED.monthly_token_limit,
    price_monthly_cents = EXCLUDED.price_monthly_cents,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Add trigger for updated_at on tier_limits
DROP TRIGGER IF EXISTS update_tier_limits_updated_at ON tier_limits;
CREATE TRIGGER update_tier_limits_updated_at
    BEFORE UPDATE ON tier_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Create credit_packages reference table
-- ============================================================================
-- Stores available token credit packages for enterprise purchases

CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY,  -- e.g., 'credits_20m'
    token_amount BIGINT NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_price_id TEXT,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default credit packages
INSERT INTO credit_packages (id, token_amount, price_cents, display_name) VALUES
    ('credits_20m', 20000000, 2000, '20M Tokens'),
    ('credits_50m', 50000000, 5000, '50M Tokens'),
    ('credits_100m', 100000000, 10000, '100M Tokens'),
    ('credits_500m', 500000000, 50000, '500M Tokens')
ON CONFLICT (id) DO UPDATE SET
    token_amount = EXCLUDED.token_amount,
    price_cents = EXCLUDED.price_cents,
    display_name = EXCLUDED.display_name;

-- ============================================================================
-- Create payment_history table
-- ============================================================================
-- Tracks all payments for audit and display purposes

CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Payment details
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    stripe_checkout_session_id TEXT,

    -- What was purchased
    payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'credit_package', 'upgrade', 'renewal')),
    tier_or_package TEXT,  -- e.g., 'pro', 'max', 'credits_50m'

    -- Amounts
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_payment_history_account_id ON payment_history(account_id);

-- ============================================================================
-- Update default token_limit based on tier
-- ============================================================================
-- This function ensures token_limit matches tier when tier changes

CREATE OR REPLACE FUNCTION sync_token_limit_with_tier()
RETURNS TRIGGER AS $$
DECLARE
    new_limit BIGINT;
BEGIN
    -- Only sync for subscription tiers (not enterprise which uses credits)
    IF NEW.tier != 'enterprise' THEN
        SELECT monthly_token_limit INTO new_limit
        FROM tier_limits
        WHERE tier = NEW.tier;

        IF new_limit IS NOT NULL THEN
            NEW.token_limit := new_limit;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_token_limit_trigger ON accounts;
CREATE TRIGGER sync_token_limit_trigger
    BEFORE UPDATE OF tier ON accounts
    FOR EACH ROW
    WHEN (OLD.tier IS DISTINCT FROM NEW.tier)
    EXECUTE FUNCTION sync_token_limit_with_tier();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN accounts.weekly_tokens_used IS 'Tokens used in current week (resets every 7 days)';
COMMENT ON COLUMN accounts.week_start_date IS 'Start of current weekly tracking period';
COMMENT ON COLUMN accounts.token_credits IS 'Prepaid token credits for enterprise tier';
COMMENT ON COLUMN accounts.stripe_payment_method_id IS 'Default Stripe payment method for this account';

COMMENT ON TABLE tier_limits IS 'Configuration for subscription tiers (limits, pricing, features)';
COMMENT ON TABLE credit_packages IS 'Available token credit packages for enterprise purchases';
COMMENT ON TABLE payment_history IS 'Audit log of all payments and subscription changes';

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================
ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Tier limits and credit packages are public read (no sensitive data)
CREATE POLICY "tier_limits_read_all" ON tier_limits FOR SELECT USING (true);
CREATE POLICY "credit_packages_read_all" ON credit_packages FOR SELECT USING (true);

-- Payment history is restricted (service role bypasses RLS anyway)
-- No policy = denied by default for non-service-role access

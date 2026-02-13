-- ============================================================================
-- Serotonin Dashboard - Accounts Table
-- ============================================================================
-- This table stores user account data linked to Clerk authentication.
--
-- Relationship with Clerk:
-- ┌─────────────┐         ┌─────────────┐
-- │   Clerk     │ userId  │  Supabase   │
-- │  (Auth)     │────────►│  accounts   │
-- └─────────────┘         └─────────────┘
--
-- The clerk_user_id is the primary link between Clerk and Supabase.
-- All other tables reference accounts.id (not clerk_user_id directly).
-- ============================================================================

-- Create enum for subscription tiers
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to Clerk user
    clerk_user_id TEXT NOT NULL UNIQUE,

    -- Subscription info
    tier subscription_tier NOT NULL DEFAULT 'free',
    token_limit INTEGER NOT NULL DEFAULT 10000,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Stripe integration (optional)
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups by clerk_user_id
CREATE INDEX IF NOT EXISTS idx_accounts_clerk_user_id ON accounts(clerk_user_id);

-- Create index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer_id ON accounts(stripe_customer_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Note: The dashboard uses service role key which bypasses RLS.
-- These policies are for additional security if using anon key.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own account
-- (requires passing clerk_user_id via RLS context, not commonly used)
-- For now, we rely on service role key which bypasses RLS.

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE accounts IS 'User accounts linked to Clerk authentication';
COMMENT ON COLUMN accounts.clerk_user_id IS 'Clerk user ID - primary link to authentication';
COMMENT ON COLUMN accounts.tier IS 'Subscription tier: free, pro, or enterprise';
COMMENT ON COLUMN accounts.token_limit IS 'Monthly token allocation based on tier';
COMMENT ON COLUMN accounts.tokens_used IS 'Tokens consumed in current billing cycle';
COMMENT ON COLUMN accounts.billing_cycle_start IS 'Start of current billing cycle';

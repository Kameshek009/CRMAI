-- ============================================================================
-- Migration 016: Per-seat team billing
-- Moves billing from accounts to teams. Director pays per seat.
-- ============================================================================

-- Add billing columns to teams
ALTER TABLE teams ADD COLUMN tier subscription_tier NOT NULL DEFAULT 'free';
ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE teams ADD COLUMN token_limit INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE teams ADD COLUMN tokens_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN weekly_tokens_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN week_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE teams ADD COLUMN billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE teams ADD COLUMN seat_count INTEGER NOT NULL DEFAULT 1;

-- Indexes for Stripe lookups
CREATE INDEX idx_teams_stripe_customer ON teams(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_teams_stripe_sub ON teams(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Constraint: 1 active (non-deleted) created team per account
CREATE UNIQUE INDEX idx_teams_one_per_owner ON teams(owner_account_id) WHERE deleted_at IS NULL;

-- Add team_id to payment_history for team-level billing
ALTER TABLE payment_history ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX idx_payment_history_team ON payment_history(team_id) WHERE team_id IS NOT NULL;

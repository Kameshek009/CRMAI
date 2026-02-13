-- ============================================================================
-- Add email and name columns to accounts table
-- ============================================================================
-- These columns store user information synced from Clerk authentication.
-- This denormalization allows faster queries without calling Clerk API.
-- ============================================================================

-- Add email column
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add name column
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index for email lookups (useful for searching/filtering)
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN accounts.email IS 'User email address synced from Clerk';
COMMENT ON COLUMN accounts.name IS 'User display name synced from Clerk';

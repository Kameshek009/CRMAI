-- ============================================================================
-- Desktop Sessions Table
-- ============================================================================
-- Stores refresh tokens for desktop app authentication.
-- This enables the "Auth Once" pattern where users stay logged in for 90 days.
--
-- Architecture:
-- ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
-- │  Access Token   │     │  Refresh Token  │     │  This Table     │
-- │  (JWT, 1 hour)  │     │  (drt_xxx)      │     │  (Revocable)    │
-- └─────────────────┘     └─────────────────┘     └─────────────────┘
--        │                        │                       │
--        │  Used for API calls    │  Stored in keychain   │  Stored here
--        │  Short-lived           │  Long-lived (90 days) │  Can be revoked
--        │  Not revocable         │  Revocable            │  Device tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS desktop_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to account
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Refresh token (hashed for security in production, plain for now)
    refresh_token TEXT NOT NULL UNIQUE,

    -- Device information for session management
    device_name TEXT,
    device_id TEXT,
    ip_address TEXT,
    user_agent TEXT,

    -- Session lifecycle
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = never expires
    revoked BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast refresh token lookups
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_refresh_token
    ON desktop_sessions(refresh_token)
    WHERE revoked = FALSE;

-- Index for finding sessions by account (for device management)
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_account_id
    ON desktop_sessions(account_id)
    WHERE revoked = FALSE;

-- Index for finding sessions by device (to revoke old sessions on same device)
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_device_id
    ON desktop_sessions(account_id, device_id)
    WHERE revoked = FALSE;

-- Auto-update last_used_at is handled by the refresh endpoint, not a trigger

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Using service role key which bypasses RLS, but enabling for defense in depth

ALTER TABLE desktop_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE desktop_sessions IS 'Desktop app refresh token sessions - enables persistent login';
COMMENT ON COLUMN desktop_sessions.refresh_token IS 'Refresh token (drt_xxx format) stored in OS keychain';
COMMENT ON COLUMN desktop_sessions.device_id IS 'Unique device identifier for session management';
COMMENT ON COLUMN desktop_sessions.revoked IS 'TRUE when user logs out or admin revokes session';
COMMENT ON COLUMN desktop_sessions.expires_at IS 'NULL for never-expiring tokens, or timestamp for 90-day expiry';

-- Sidebar customization: user-level override stored on accounts table
-- Team-level defaults stored in teams.settings JSONB under "sidebar_defaults" key (no schema change needed)

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sidebar_config JSONB DEFAULT NULL;

COMMENT ON COLUMN accounts.sidebar_config IS 'User-level sidebar customization (order + visibility). NULL = use team defaults or system defaults.';

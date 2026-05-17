-- Migration 060: live CRM imports from HubSpot / AmoCRM / Bitrix24 / Salesforce
--
-- Adds:
--   1. New oauth_provider enum values for the four importer providers.
--   2. `crm_imports` table to track import jobs and surface progress in the UI.
--      One row per import run; the job-runner updates counters as it walks
--      the provider's pagination.
--
-- Why a dedicated table (not just outbox events): import jobs can run for
-- minutes to hours and we want a single source of truth the UI can poll
-- for progress, plus retroactive history (last 30 imports, error log,
-- "what got imported from where"). Outbox is fire-and-forget for external
-- subscribers, not durable progress.

BEGIN;

-- 1) Extend oauth_provider enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'hubspot'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'oauth_provider')) THEN
    ALTER TYPE oauth_provider ADD VALUE 'hubspot';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'amocrm'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'oauth_provider')) THEN
    ALTER TYPE oauth_provider ADD VALUE 'amocrm';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bitrix24'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'oauth_provider')) THEN
    ALTER TYPE oauth_provider ADD VALUE 'bitrix24';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'salesforce'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'oauth_provider')) THEN
    ALTER TYPE oauth_provider ADD VALUE 'salesforce';
  END IF;
END $$;

-- 2) crm_imports job-tracking table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_import_status') THEN
    CREATE TYPE crm_import_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS crm_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  status crm_import_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  -- Entity counts per type, e.g. {"contacts": 1234, "companies": 56, "deals": 12}
  total_records JSONB NOT NULL DEFAULT '{}',
  imported_records JSONB NOT NULL DEFAULT '{}',
  skipped_records JSONB NOT NULL DEFAULT '{}',
  error_count INTEGER NOT NULL DEFAULT 0,
  -- Latest 100 errors so we don't unbounded-grow the row.
  errors JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_imports_team_started
  ON crm_imports (team_id, started_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_crm_imports_status_pending
  ON crm_imports (status)
  WHERE status IN ('pending', 'running');

DROP TRIGGER IF EXISTS trg_crm_imports_updated_at ON crm_imports;
CREATE TRIGGER trg_crm_imports_updated_at
  BEFORE UPDATE ON crm_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE crm_imports ENABLE ROW LEVEL SECURITY;

COMMIT;

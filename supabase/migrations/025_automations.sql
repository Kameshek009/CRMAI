-- ============================================================================
-- Migration 025: Automations (Simple Rules)
-- Trigger → Condition → Action automation system
-- ============================================================================

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL,
  -- 'record_created', 'record_updated', 'field_changed', 'deal_stage_changed'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- e.g. {entity_type: 'deals', field: 'status', from: 'open', to: 'won'}
  conditions JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{field: 'value', operator: 'gt', value: 1000}]
  actions JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{type: 'create_task', config: {title: '...', assigned_to: '...'}}]
  created_by UUID REFERENCES accounts(id),
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automations_team ON automations(team_id, is_active);

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  trigger_data JSONB,
  actions_executed JSONB,
  status TEXT NOT NULL, -- 'success', 'error', 'skipped'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_logs_automation ON automation_logs(automation_id, created_at DESC);

-- Enable RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

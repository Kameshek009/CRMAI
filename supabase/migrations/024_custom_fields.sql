-- ============================================================================
-- Migration 024: Custom Field Definitions
-- Custom fields are stored in the existing `metadata` JSONB column on CRM tables.
-- This table defines what custom fields exist per workspace + entity type.
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'contact', 'company', 'deal', 'lead'
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text','number','date','select','multi_select','url','email','phone','boolean','currency','percent','textarea'
  options JSONB, -- for select/multi_select: [{"value":"x","label":"X","color":"#fff"}]
  is_required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, entity_type, field_key)
);

CREATE INDEX idx_field_definitions_team ON field_definitions(team_id, entity_type);

-- Enable RLS
ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;

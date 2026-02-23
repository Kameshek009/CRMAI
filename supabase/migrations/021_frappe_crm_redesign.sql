-- ============================================================================
-- Migration 021: Frappe CRM Redesign — New Tables
-- Creates: leads, call_logs, saved_views, email_communications
-- Alters: crm_activities, crm_notes, crm_tasks (add lead_id)
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'junk'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE call_log_status AS ENUM ('completed', 'missed', 'no_answer', 'busy', 'voicemail', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE call_direction AS ENUM ('inbound', 'outbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE email_status AS ENUM ('draft', 'sent', 'received', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- LEADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  organization TEXT,
  website TEXT,
  job_title TEXT,
  source TEXT,
  status lead_status DEFAULT 'new',
  lead_owner_account_id UUID REFERENCES accounts(id),
  converted_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  converted_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_team_id ON leads(team_id);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(team_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(team_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(team_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(lead_owner_account_id);
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON leads(team_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(team_id, created_at DESC);

-- ============================================================================
-- CALL LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  caller_account_id UUID REFERENCES accounts(id),
  direction call_direction DEFAULT 'outbound',
  status call_log_status DEFAULT 'completed',
  duration_seconds INTEGER DEFAULT 0,
  from_number TEXT,
  to_number TEXT,
  summary TEXT,
  recording_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_team_id ON call_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_contact_id ON call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_deal_id ON call_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(team_id, status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_is_deleted ON call_logs(team_id, is_deleted);

-- ============================================================================
-- SAVED VIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  filters JSONB DEFAULT '{}',
  sort_by TEXT,
  sort_order TEXT DEFAULT 'desc',
  group_by TEXT,
  columns TEXT[] DEFAULT '{}',
  view_mode TEXT DEFAULT 'table',
  is_pinned BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_team_id ON saved_views(team_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_entity ON saved_views(team_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_saved_views_creator ON saved_views(created_by_account_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_pinned ON saved_views(team_id, is_pinned) WHERE is_pinned = true;

-- ============================================================================
-- EMAIL COMMUNICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  from_email TEXT NOT NULL,
  to_emails TEXT[] DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',
  direction call_direction DEFAULT 'outbound',
  status email_status DEFAULT 'sent',
  message_id TEXT,
  in_reply_to TEXT,
  thread_id TEXT,
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_team_id ON email_communications(team_id);
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON email_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON email_communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_deal_id ON email_communications(deal_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON email_communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON email_communications(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_deleted ON email_communications(team_id, is_deleted);

-- ============================================================================
-- ALTER EXISTING TABLES: Add lead_id references
-- ============================================================================

ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_lead_id ON crm_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON crm_tasks(lead_id);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_call_logs_updated_at ON call_logs;
CREATE TRIGGER trg_call_logs_updated_at BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saved_views_updated_at ON saved_views;
CREATE TRIGGER trg_saved_views_updated_at BEFORE UPDATE ON saved_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON leads;
CREATE POLICY "Service role full access" ON leads FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON call_logs;
CREATE POLICY "Service role full access" ON call_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON saved_views;
CREATE POLICY "Service role full access" ON saved_views FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON email_communications;
CREATE POLICY "Service role full access" ON email_communications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REALTIME
-- ============================================================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE call_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE saved_views; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

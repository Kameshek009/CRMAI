-- ============================================================================
-- Migration 009: CRM Tables for Nexxus CRM
-- Creates: companies, contacts, deal_stages, deals, tasks, activities, notes
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE contact_status AS ENUM ('lead', 'active', 'inactive', 'churned');
CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_type AS ENUM ('call', 'email', 'meeting', 'follow_up', 'other');
CREATE TYPE activity_type AS ENUM (
  'note', 'call', 'email', 'meeting', 'deal_created', 'deal_stage_changed',
  'deal_won', 'deal_lost', 'contact_created', 'task_completed', 'import'
);

-- ============================================================================
-- COMPANIES
-- ============================================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT, -- e.g. '1-10', '11-50', '51-200', '201-500', '500+'
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  description TEXT,
  ai_health_score INTEGER DEFAULT 50 CHECK (ai_health_score >= 0 AND ai_health_score <= 100),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_account_id ON companies(account_id);
CREATE INDEX idx_companies_name ON companies(account_id, name);
CREATE INDEX idx_companies_domain ON companies(account_id, domain);
CREATE INDEX idx_companies_is_deleted ON companies(account_id, is_deleted);

-- ============================================================================
-- CONTACTS
-- ============================================================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT, -- job title
  status contact_status DEFAULT 'lead',
  source TEXT, -- e.g. 'website', 'referral', 'cold_call', 'import'
  ai_sentiment TEXT, -- e.g. 'positive', 'neutral', 'negative'
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  last_contacted_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(account_id, email);
CREATE INDEX idx_contacts_status ON contacts(account_id, status);
CREATE INDEX idx_contacts_is_deleted ON contacts(account_id, is_deleted);
CREATE INDEX idx_contacts_name ON contacts(account_id, first_name, last_name);

-- ============================================================================
-- DEAL STAGES
-- ============================================================================

CREATE TABLE deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_stages_account_id ON deal_stages(account_id);
CREATE UNIQUE INDEX idx_deal_stages_position ON deal_stages(account_id, position);

-- ============================================================================
-- DEALS
-- ============================================================================

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES deal_stages(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status deal_status DEFAULT 'open',
  ai_win_probability INTEGER DEFAULT 50 CHECK (ai_win_probability >= 0 AND ai_win_probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_account_id ON deals(account_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_deals_status ON deals(account_id, status);
CREATE INDEX idx_deals_is_deleted ON deals(account_id, is_deleted);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type task_type DEFAULT 'other',
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_ai_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crm_tasks_account_id ON crm_tasks(account_id);
CREATE INDEX idx_crm_tasks_contact_id ON crm_tasks(contact_id);
CREATE INDEX idx_crm_tasks_deal_id ON crm_tasks(deal_id);
CREATE INDEX idx_crm_tasks_status ON crm_tasks(account_id, status);
CREATE INDEX idx_crm_tasks_due_date ON crm_tasks(account_id, due_date);
CREATE INDEX idx_crm_tasks_priority ON crm_tasks(account_id, priority);

-- ============================================================================
-- ACTIVITIES
-- ============================================================================

CREATE TABLE crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crm_activities_account_id ON crm_activities(account_id);
CREATE INDEX idx_crm_activities_contact_id ON crm_activities(contact_id);
CREATE INDEX idx_crm_activities_deal_id ON crm_activities(deal_id);
CREATE INDEX idx_crm_activities_company_id ON crm_activities(company_id);
CREATE INDEX idx_crm_activities_type ON crm_activities(account_id, type);
CREATE INDEX idx_crm_activities_created_at ON crm_activities(account_id, created_at DESC);

-- ============================================================================
-- NOTES
-- ============================================================================

CREATE TABLE crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crm_notes_account_id ON crm_notes(account_id);
CREATE INDEX idx_crm_notes_contact_id ON crm_notes(contact_id);
CREATE INDEX idx_crm_notes_deal_id ON crm_notes(deal_id);
CREATE INDEX idx_crm_notes_company_id ON crm_notes(company_id);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_deal_stages_updated_at BEFORE UPDATE ON deal_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_crm_notes_updated_at BEFORE UPDATE ON crm_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED: Default deal stages for new accounts
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_default_deal_stages(p_account_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO deal_stages (account_id, name, position, color, is_won, is_lost) VALUES
    (p_account_id, 'Lead',         0, '#94a3b8', false, false),
    (p_account_id, 'Qualified',    1, '#6366f1', false, false),
    (p_account_id, 'Proposal',     2, '#f59e0b', false, false),
    (p_account_id, 'Negotiation',  3, '#f97316', false, false),
    (p_account_id, 'Won',          4, '#22c55e', true,  false),
    (p_account_id, 'Lost',         5, '#ef4444', false, true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

-- Service role bypass (API routes use service role key)
CREATE POLICY "Service role full access" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON deal_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_notes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_activities;

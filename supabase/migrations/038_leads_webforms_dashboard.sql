-- ============================================================================
-- Migration 038: Leads Web Forms + Dashboard Layouts
-- ============================================================================

-- ============================================================================
-- 1. WEB FORMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS web_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB DEFAULT '[]',
  success_message TEXT DEFAULT 'Thank you for your submission!',
  redirect_url TEXT,
  notify_emails TEXT[] DEFAULT '{}',
  primary_color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_forms_team ON web_forms(team_id);
CREATE INDEX IF NOT EXISTS idx_web_forms_slug ON web_forms(slug) WHERE is_deleted = false;

-- ============================================================================
-- 2. WEB FORM SUBMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS web_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES web_forms(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_form_submissions_form ON web_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_web_form_submissions_team ON web_form_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_web_form_submissions_created ON web_form_submissions(team_id, created_at DESC);

-- ============================================================================
-- 3. DASHBOARD LAYOUTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Dashboard',
  widgets JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_account ON dashboard_layouts(account_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_team ON dashboard_layouts(team_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_web_forms_updated_at BEFORE UPDATE ON web_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_dashboard_layouts_updated_at BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE web_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON web_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON web_form_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON dashboard_layouts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE web_forms;
ALTER PUBLICATION supabase_realtime ADD TABLE web_form_submissions;

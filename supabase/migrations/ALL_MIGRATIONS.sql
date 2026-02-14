-- ============================================================================
-- ALL MIGRATIONS (001-009) Combined
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ====== 001: ACCOUNTS ======
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'max', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL UNIQUE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    token_limit INTEGER NOT NULL DEFAULT 10000,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_clerk_user_id ON accounts(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer_id ON accounts(stripe_customer_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- ====== 002: DESKTOP SESSIONS ======
CREATE TABLE IF NOT EXISTS desktop_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL UNIQUE,
    device_name TEXT,
    device_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desktop_sessions_refresh_token ON desktop_sessions(refresh_token) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_account_id ON desktop_sessions(account_id) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_device_id ON desktop_sessions(account_id, device_id) WHERE revoked = FALSE;
ALTER TABLE desktop_sessions ENABLE ROW LEVEL SECURITY;

-- ====== 003: PAYMENT SYSTEM ======
-- 'max' already included in initial enum creation above

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS weekly_tokens_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS week_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS token_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

CREATE OR REPLACE FUNCTION reset_weekly_tokens_if_needed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.week_start_date + INTERVAL '7 days' < NOW() THEN
        NEW.weekly_tokens_used := 0;
        NEW.week_start_date := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reset_weekly_tokens_trigger ON accounts;
CREATE TRIGGER reset_weekly_tokens_trigger
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION reset_weekly_tokens_if_needed();

CREATE TABLE IF NOT EXISTS tier_limits (
    tier subscription_tier PRIMARY KEY,
    monthly_token_limit BIGINT NOT NULL,
    weekly_token_limit BIGINT GENERATED ALWAYS AS (monthly_token_limit / 4) STORED,
    price_monthly_cents INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tier_limits (tier, monthly_token_limit, price_monthly_cents, features) VALUES
    ('free', 1000000, 0, '["Basic usage", "Community support", "7-day history"]'::jsonb),
    ('pro', 10000000, 2000, '["Priority support", "30-day history", "API access", "Advanced analytics"]'::jsonb),
    ('max', 100000000, 10000, '["Dedicated support", "Unlimited history", "Custom integrations", "SLA guarantee"]'::jsonb),
    ('enterprise', 0, 0, '["Volume pricing", "Custom contracts", "Dedicated infrastructure", "24/7 support"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
    monthly_token_limit = EXCLUDED.monthly_token_limit,
    price_monthly_cents = EXCLUDED.price_monthly_cents,
    features = EXCLUDED.features,
    updated_at = NOW();

DROP TRIGGER IF EXISTS update_tier_limits_updated_at ON tier_limits;
CREATE TRIGGER update_tier_limits_updated_at
    BEFORE UPDATE ON tier_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY,
    token_amount BIGINT NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_price_id TEXT,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO credit_packages (id, token_amount, price_cents, display_name) VALUES
    ('credits_20m', 20000000, 2000, '20M Tokens'),
    ('credits_50m', 50000000, 5000, '50M Tokens'),
    ('credits_100m', 100000000, 10000, '100M Tokens'),
    ('credits_500m', 500000000, 50000, '500M Tokens')
ON CONFLICT (id) DO UPDATE SET
    token_amount = EXCLUDED.token_amount,
    price_cents = EXCLUDED.price_cents,
    display_name = EXCLUDED.display_name;

CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    stripe_checkout_session_id TEXT,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'credit_package', 'upgrade', 'renewal')),
    tier_or_package TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_history_account_id ON payment_history(account_id);

CREATE OR REPLACE FUNCTION sync_token_limit_with_tier()
RETURNS TRIGGER AS $$
DECLARE
    new_limit BIGINT;
BEGIN
    IF NEW.tier != 'enterprise' THEN
        SELECT monthly_token_limit INTO new_limit
        FROM tier_limits
        WHERE tier = NEW.tier;
        IF new_limit IS NOT NULL THEN
            NEW.token_limit := new_limit;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_token_limit_trigger ON accounts;
CREATE TRIGGER sync_token_limit_trigger
    BEFORE UPDATE OF tier ON accounts
    FOR EACH ROW
    WHEN (OLD.tier IS DISTINCT FROM NEW.tier)
    EXECUTE FUNCTION sync_token_limit_with_tier();

ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tier_limits_read_all" ON tier_limits FOR SELECT USING (true);
CREATE POLICY "credit_packages_read_all" ON credit_packages FOR SELECT USING (true);

-- ====== 004: ADD USER INFO ======
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS name TEXT;
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- ====== 005: CHATS ======
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT,
  mode TEXT NOT NULL DEFAULT 'chat' CHECK (mode IN ('chat', 'agent', 'auto')),
  vision_board_id UUID,
  device_origin TEXT,
  last_synced_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'plan', 'action', 'result', 'error')),
  tokens_used INTEGER DEFAULT 0,
  local_id TEXT,
  device_origin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vision_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed', 'cancelled')),
  board_data JSONB NOT NULL DEFAULT '{}',
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  current_phase TEXT,
  current_task TEXT,
  device_origin TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chat', 'message', 'vision_board')),
  entity_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  device_id TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'web')),
  previous_data JSONB,
  new_data JSONB,
  vector_clock JSONB DEFAULT '{}',
  conflict_detected BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_strategy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_account ON chats(account_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_not_deleted ON chats(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vision_boards_account ON vision_boards(account_id);
CREATE INDEX IF NOT EXISTS idx_vision_boards_chat ON vision_boards(chat_id);
CREATE INDEX IF NOT EXISTS idx_vision_boards_status ON vision_boards(status) WHERE status IN ('active', 'pending');
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_account ON sync_log(account_id);

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vision_boards_updated_at
  BEFORE UPDATE ON vision_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY chats_select_policy ON chats
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY chats_insert_policy ON chats
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY chats_update_policy ON chats
  FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY chats_delete_policy ON chats
  FOR DELETE USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY messages_select_policy ON messages
  FOR SELECT USING (
    chat_id IN (SELECT c.id FROM chats c JOIN accounts a ON c.account_id = a.id WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY messages_insert_policy ON messages
  FOR INSERT WITH CHECK (
    chat_id IN (SELECT c.id FROM chats c JOIN accounts a ON c.account_id = a.id WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY messages_update_policy ON messages
  FOR UPDATE USING (
    chat_id IN (SELECT c.id FROM chats c JOIN accounts a ON c.account_id = a.id WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY messages_delete_policy ON messages
  FOR DELETE USING (
    chat_id IN (SELECT c.id FROM chats c JOIN accounts a ON c.account_id = a.id WHERE a.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY vision_boards_select_policy ON vision_boards
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY vision_boards_insert_policy ON vision_boards
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY vision_boards_update_policy ON vision_boards
  FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );
CREATE POLICY vision_boards_delete_policy ON vision_boards
  FOR DELETE USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY sync_log_all_policy ON sync_log
  FOR ALL USING (
    account_id IN (SELECT id FROM accounts WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE vision_boards;

CREATE OR REPLACE FUNCTION soft_delete_chat(chat_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chats SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = chat_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restore_chat(chat_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chats SET is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE id = chat_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_chat_title(chat_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  first_message TEXT;
  generated_title TEXT;
BEGIN
  SELECT content INTO first_message FROM messages WHERE chat_id = chat_uuid AND role = 'user' ORDER BY created_at ASC LIMIT 1;
  IF first_message IS NULL THEN RETURN 'New Chat'; END IF;
  IF LENGTH(first_message) > 50 THEN generated_title := LEFT(first_message, 47) || '...';
  ELSE generated_title := first_message; END IF;
  RETURN generated_title;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_chat_with_stats(chat_uuid UUID)
RETURNS TABLE (id UUID, title TEXT, mode TEXT, message_count BIGINT, last_message_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, COALESCE(c.title, generate_chat_title(c.id)) as title, c.mode,
    COUNT(m.id) as message_count, MAX(m.created_at) as last_message_at, c.created_at, c.updated_at
  FROM chats c LEFT JOIN messages m ON m.chat_id = c.id
  WHERE c.id = chat_uuid AND c.is_deleted = FALSE
  GROUP BY c.id, c.title, c.mode, c.created_at, c.updated_at;
END;
$$ LANGUAGE plpgsql;

-- ====== 006: ADD MAX TIER ======
-- 'max' already included in initial enum creation above

-- ====== 007: CHATS WITH USER VIEW ======
DROP VIEW IF EXISTS chats_with_user;
CREATE VIEW chats_with_user WITH (security_invoker = true) AS
SELECT
  c.id AS chat_id, c.account_id, a.name AS user_name, a.email AS user_email,
  c.title, c.mode, c.device_origin, c.is_deleted, c.created_at, c.updated_at, c.last_synced_at,
  (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) AS message_count,
  (SELECT content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
FROM chats c LEFT JOIN accounts a ON c.account_id = a.id
ORDER BY c.updated_at DESC;

-- ====== 008: DESKTOP AGENT STATUS ======
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_online BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_mode TEXT DEFAULT 'chat' CHECK (desktop_agent_mode IN ('chat', 'agent', 'auto'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_last_seen TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS desktop_agent_version TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_desktop_agent_status ON accounts (desktop_agent_online, desktop_agent_last_seen);

CREATE OR REPLACE FUNCTION check_desktop_agent_offline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.desktop_agent_last_seen IS NOT NULL AND NEW.desktop_agent_last_seen < NOW() - INTERVAL '2 minutes' THEN
    NEW.desktop_agent_online := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_device_origin ON messages (device_origin) WHERE device_origin IS NOT NULL;

GRANT SELECT, UPDATE ON accounts TO authenticated;
GRANT SELECT, UPDATE ON accounts TO service_role;

-- ====== 009: CRM TABLES ======
CREATE TYPE contact_status AS ENUM ('lead', 'active', 'inactive', 'churned');
CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_type AS ENUM ('call', 'email', 'meeting', 'follow_up', 'other');
CREATE TYPE activity_type AS ENUM (
  'note', 'call', 'email', 'meeting', 'deal_created', 'deal_stage_changed',
  'deal_won', 'deal_lost', 'contact_created', 'task_completed', 'import'
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, domain TEXT, industry TEXT, size TEXT, phone TEXT, email TEXT,
  address TEXT, website TEXT, description TEXT,
  ai_health_score INTEGER DEFAULT 50 CHECK (ai_health_score >= 0 AND ai_health_score <= 100),
  tags TEXT[] DEFAULT '{}', metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_companies_account_id ON companies(account_id);
CREATE INDEX idx_companies_name ON companies(account_id, name);
CREATE INDEX idx_companies_domain ON companies(account_id, domain);
CREATE INDEX idx_companies_is_deleted ON companies(account_id, is_deleted);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL, last_name TEXT, email TEXT, phone TEXT, title TEXT,
  status contact_status DEFAULT 'lead', source TEXT,
  ai_sentiment TEXT, engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  last_contacted_at TIMESTAMPTZ, tags TEXT[] DEFAULT '{}', metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(account_id, email);
CREATE INDEX idx_contacts_status ON contacts(account_id, status);
CREATE INDEX idx_contacts_is_deleted ON contacts(account_id, is_deleted);
CREATE INDEX idx_contacts_name ON contacts(account_id, first_name, last_name);

CREATE TABLE deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1', is_won BOOLEAN DEFAULT false, is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_deal_stages_account_id ON deal_stages(account_id);
CREATE UNIQUE INDEX idx_deal_stages_position ON deal_stages(account_id, position);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES deal_stages(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL, value NUMERIC(15,2) DEFAULT 0, currency TEXT DEFAULT 'USD',
  status deal_status DEFAULT 'open',
  ai_win_probability INTEGER DEFAULT 50 CHECK (ai_win_probability >= 0 AND ai_win_probability <= 100),
  expected_close_date DATE, actual_close_date DATE, description TEXT,
  tags TEXT[] DEFAULT '{}', metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_deals_account_id ON deals(account_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_deals_status ON deals(account_id, status);
CREATE INDEX idx_deals_is_deleted ON deals(account_id, is_deleted);

CREATE TABLE crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT,
  type task_type DEFAULT 'other', priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  due_date TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  is_ai_generated BOOLEAN DEFAULT false, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_crm_tasks_account_id ON crm_tasks(account_id);
CREATE INDEX idx_crm_tasks_contact_id ON crm_tasks(contact_id);
CREATE INDEX idx_crm_tasks_deal_id ON crm_tasks(deal_id);
CREATE INDEX idx_crm_tasks_status ON crm_tasks(account_id, status);
CREATE INDEX idx_crm_tasks_due_date ON crm_tasks(account_id, due_date);
CREATE INDEX idx_crm_tasks_priority ON crm_tasks(account_id, priority);

CREATE TABLE crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type activity_type NOT NULL, title TEXT NOT NULL, description TEXT,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_crm_activities_account_id ON crm_activities(account_id);
CREATE INDEX idx_crm_activities_contact_id ON crm_activities(contact_id);
CREATE INDEX idx_crm_activities_deal_id ON crm_activities(deal_id);
CREATE INDEX idx_crm_activities_company_id ON crm_activities(company_id);
CREATE INDEX idx_crm_activities_type ON crm_activities(account_id, type);
CREATE INDEX idx_crm_activities_created_at ON crm_activities(account_id, created_at DESC);

CREATE TABLE crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  content TEXT NOT NULL, is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_crm_notes_account_id ON crm_notes(account_id);
CREATE INDEX idx_crm_notes_contact_id ON crm_notes(contact_id);
CREATE INDEX idx_crm_notes_deal_id ON crm_notes(deal_id);
CREATE INDEX idx_crm_notes_company_id ON crm_notes(company_id);

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_deal_stages_updated_at BEFORE UPDATE ON deal_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_crm_notes_updated_at BEFORE UPDATE ON crm_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON deal_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON crm_notes FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_activities;

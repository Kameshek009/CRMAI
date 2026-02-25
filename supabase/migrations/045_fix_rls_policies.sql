-- Migration 045: Fix RLS policies — replace permissive USING(true) with deny-by-default
--
-- Context: All CRM tables had "Service role full access" policies with USING(true),
-- effectively disabling RLS. Anyone with the anon key could read/write ALL data.
-- The service_role key (used by API routes) bypasses RLS entirely, so removing
-- these policies does NOT affect application functionality.
--
-- Strategy:
--   1. Drop all permissive "USING(true)" policies on CRM data tables
--      → anon key gets NO access (RLS enabled + no matching policy = deny)
--   2. Keep existing functional policies (chats, notifications, goals, merge_log)
--   3. For realtime-subscribed tables (teams, team_members): SELECT-only for anon

BEGIN;

-- ============================================================
-- 1. DROP permissive policies on CRM data tables
-- ============================================================

-- Core CRM (migration 009)
DROP POLICY IF EXISTS "Service role full access" ON companies;
DROP POLICY IF EXISTS "Service role full access" ON contacts;
DROP POLICY IF EXISTS "Service role full access" ON deal_stages;
DROP POLICY IF EXISTS "Service role full access" ON deals;
DROP POLICY IF EXISTS "Service role full access" ON crm_tasks;
DROP POLICY IF EXISTS "Service role full access" ON crm_activities;
DROP POLICY IF EXISTS "Service role full access" ON crm_notes;

-- Extended CRM (migration 021)
DROP POLICY IF EXISTS "Service role full access" ON leads;
DROP POLICY IF EXISTS "Service role full access" ON call_logs;
DROP POLICY IF EXISTS "Service role full access" ON saved_views;
DROP POLICY IF EXISTS "Service role full access" ON email_communications;

-- Web forms & dashboards (migration 038)
DROP POLICY IF EXISTS "Service role full access" ON web_forms;
DROP POLICY IF EXISTS "Service role full access" ON web_form_submissions;
DROP POLICY IF EXISTS "Service role full access" ON dashboard_layouts;

-- Property showings (migration 044)
DROP POLICY IF EXISTS "Service role full access" ON property_showings;

-- WhatsApp (migration 041)
DROP POLICY IF EXISTS "Service role full access on whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Service role full access on whatsapp_webhook_events" ON whatsapp_webhook_events;

-- ============================================================
-- 2. Ensure RLS is enabled on all tables (idempotent)
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- Tables that had RLS enabled but no policies (already locked down for anon)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE desktop_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Realtime-subscribed tables: SELECT-only for anon
-- ============================================================

-- teams: used in account-context.tsx and team-context.tsx realtime subscriptions
DROP POLICY IF EXISTS "Service role full access" ON teams;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read for realtime" ON teams
  FOR SELECT USING (true);

-- team_members: may be used in realtime subscriptions
DROP POLICY IF EXISTS "Service role full access" ON team_members;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read for realtime" ON team_members
  FOR SELECT USING (true);

COMMIT;

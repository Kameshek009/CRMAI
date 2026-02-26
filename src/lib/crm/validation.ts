import { z } from "zod";

// ============================================================================
// Contact schemas
// ============================================================================

const metadataField = z.record(z.string().max(100), z.unknown()).optional();

export const createContactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  title: z.string().trim().max(200).optional(),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["lead", "active", "inactive", "churned"]).optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: metadataField,
});

export const updateContactSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["lead", "active", "inactive", "churned"]).optional(),
  source: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  ai_sentiment: z.string().max(50).optional().nullable(),
  engagement_score: z.number().min(0).max(100).optional(),
  metadata: metadataField,
});

// ============================================================================
// Company schemas
// ============================================================================

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  domain: z.string().trim().max(253).optional(),
  industry: z.string().trim().max(100).optional(),
  size: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  website: z.string().trim().max(2000).optional(),
  description: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: metadataField,
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  domain: z.string().trim().max(253).optional().nullable(),
  industry: z.string().trim().max(100).optional().nullable(),
  size: z.string().trim().max(50).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
  address: z.string().trim().max(500).optional().nullable(),
  website: z.string().trim().max(2000).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  ai_health_score: z.number().min(0).max(100).optional(),
  metadata: metadataField,
});

// ============================================================================
// Deal schemas
// ============================================================================

export const createDealSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required").max(200),
  value: z.number().min(0).optional(),
  currency: z.string().trim().max(3).optional(),
  stage_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  expected_close_date: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: metadataField,
});

export const updateDealSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().trim().max(3).optional(),
  stage_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["open", "won", "lost"]).optional(),
  ai_win_probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().trim().max(30).optional().nullable(),
  actual_close_date: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: metadataField,
});

export const updateDealStageSchema = z.object({
  stage_id: z.string().uuid(),
  lost_reason_id: z.string().uuid().optional().nullable(),
  lost_reason_note: z.string().max(1000).optional().nullable(),
});

// ============================================================================
// Task schemas
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(300),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(["call", "email", "meeting", "follow_up", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().max(30).optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  is_ai_generated: z.boolean().optional(),
  metadata: z.record(z.string().max(100), z.unknown()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.enum(["call", "email", "meeting", "follow_up", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  due_date: z.string().max(30).optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string().max(100), z.unknown()).optional(),
});

// ============================================================================
// Note schemas
// ============================================================================

export const createNoteSchema = z.object({
  content: z.string().trim().min(1, "Note content is required").max(10000),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  is_pinned: z.boolean().optional(),
});

export const updateNoteSchema = z.object({
  content: z.string().trim().min(1).max(10000).optional(),
  is_pinned: z.boolean().optional(),
});

// ============================================================================
// Activity schema
// ============================================================================

export const createActivitySchema = z.object({
  type: z.enum([
    "note", "call", "email", "meeting", "deal_created", "deal_stage_changed",
    "deal_won", "deal_lost", "contact_created", "task_completed", "import",
  ]),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string().max(100), z.unknown()).optional(),
});

// ============================================================================
// Search & Pipeline schemas
// ============================================================================

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(500),
  types: z.array(z.enum(["contact", "company", "deal"])).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export const createPipelineStageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  position: z.number().min(0).max(100),
  color: z.string().max(20).optional(),
  is_won: z.boolean().optional(),
  is_lost: z.boolean().optional(),
});

export const reorderStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().min(0),
    })
  ),
});

// ============================================================================
// Bulk action schemas
// ============================================================================

const bulkIds = z.array(z.string().uuid()).min(1).max(100);

export const bulkContactsSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: bulkIds }),
  z.object({ action: z.literal("update_status"), ids: bulkIds, status: z.enum(["lead", "active", "inactive", "churned"]) }),
]);

export const bulkTasksSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: bulkIds }),
  z.object({ action: z.literal("update_status"), ids: bulkIds, status: z.enum(["todo", "in_progress", "done", "cancelled"]) }),
]);

export const bulkCompaniesSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: bulkIds }),
]);

export const bulkDealsSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: bulkIds }),
  z.object({ action: z.literal("update_status"), ids: bulkIds, status: z.enum(["open", "won", "lost"]) }),
]);

// ============================================================================
// Call Log schemas
// ============================================================================

export const createCallLogSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  status: z.enum(["initiated", "completed", "missed", "no_answer", "busy", "voicemail", "cancelled"]).optional(),
  duration_seconds: z.number().min(0).optional(),
  from_number: z.string().trim().max(30).optional(),
  to_number: z.string().trim().max(30).optional(),
  summary: z.string().trim().max(5000).optional(),
  recording_url: z.string().trim().max(2000).optional(),
});

export const updateCallLogSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  status: z.enum(["initiated", "completed", "missed", "no_answer", "busy", "voicemail", "cancelled"]).optional(),
  duration_seconds: z.number().min(0).optional(),
  from_number: z.string().trim().max(30).optional().nullable(),
  to_number: z.string().trim().max(30).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  recording_url: z.string().trim().max(2000).optional().nullable(),
});

// ============================================================================
// Saved View schemas
// ============================================================================

export const createSavedViewSchema = z.object({
  entity_type: z.enum(["contacts", "leads", "deals", "organizations", "tasks", "call_logs", "notes"]),
  label: z.string().trim().min(1, "View name is required").max(100),
  icon: z.string().max(50).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort_by: z.string().max(100).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  group_by: z.string().max(100).optional().nullable(),
  columns: z.array(z.string().max(100)).max(20).optional(),
  view_mode: z.enum(["table", "kanban", "group_by"]).optional(),
  is_pinned: z.boolean().optional(),
  is_public: z.boolean().optional(),
});

export const updateSavedViewSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  icon: z.string().max(50).optional().nullable(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort_by: z.string().max(100).optional().nullable(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  group_by: z.string().max(100).optional().nullable(),
  columns: z.array(z.string().max(100)).max(20).optional(),
  view_mode: z.enum(["table", "kanban", "group_by"]).optional(),
  is_pinned: z.boolean().optional(),
  is_public: z.boolean().optional(),
  position: z.number().min(0).optional(),
});

// ============================================================================
// Email Communication schemas
// ============================================================================

export const createEmailSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  subject: z.string().trim().max(500).optional(),
  body_html: z.string().max(100000).optional(),
  body_text: z.string().max(50000).optional(),
  from_email: z.string().trim().email().max(254),
  to_emails: z.array(z.string().trim().email().max(254)).min(1),
  cc_emails: z.array(z.string().trim().email().max(254)).optional(),
  bcc_emails: z.array(z.string().trim().email().max(254)).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  status: z.enum(["draft", "sent", "received", "failed"]).optional(),
});

// ============================================================================
// Goal schemas
// ============================================================================

export const createGoalSchema = z.object({
  type: z.enum(["revenue", "deals_won", "deals_created", "contacts_created", "activities_logged"]),
  target_value: z.number().min(0),
  period: z.string().min(1).max(50),
  start_date: z.string().max(30),
  end_date: z.string().max(30),
  account_id: z.union([z.literal("self"), z.string().uuid(), z.null()]).optional(),
});

export const updateGoalSchema = z.object({
  target_value: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  end_date: z.string().max(30).optional(),
});

// ============================================================================
// WhatsApp schemas
// ============================================================================

export const sendWhatsAppMessageSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  to_number: z.string().trim().min(1).max(30),
  content: z.string().trim().max(4096).optional(),
  message_type: z.enum(["text", "template"]).optional(),
  template_name: z.string().trim().max(200).optional(),
  template_params: z.array(z.string().max(1024)).optional(),
});

export const whatsappSettingsSchema = z.object({
  phone_number_id: z.string().min(1).max(100),
  waba_id: z.string().min(1).max(100),
  access_token: z.string().min(1).max(500).optional(),
  webhook_verify_token: z.string().min(1).max(100).optional(),
});

// ============================================================================
// Showing schemas
// ============================================================================

export const createShowingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  address: z.string().trim().min(1, "Address is required").max(500),
  showing_date: z.string().min(1, "Date is required"),
  duration_minutes: z.number().min(15).max(480).optional(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  agent_account_id: z.string().uuid().optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  result_notes: z.string().trim().max(5000).optional(),
});

export const updateShowingSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  showing_date: z.string().min(1).optional(),
  duration_minutes: z.number().min(15).max(480).optional(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  agent_account_id: z.string().uuid().optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  result_notes: z.string().trim().max(5000).optional().nullable(),
});

export const bulkShowingsSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: bulkIds }),
  z.object({ action: z.literal("update_status"), ids: bulkIds, status: z.enum(["scheduled", "completed", "cancelled", "no_show"]) }),
]);

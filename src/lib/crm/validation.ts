import { z } from "zod";

// ============================================================================
// Contact schemas
// ============================================================================

export const createContactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["lead", "active", "inactive", "churned"]).optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateContactSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["lead", "active", "inactive", "churned"]).optional(),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  ai_sentiment: z.string().optional().nullable(),
  engagement_score: z.number().min(0).max(100).optional(),
});

// ============================================================================
// Company schemas
// ============================================================================

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  ai_health_score: z.number().min(0).max(100).optional(),
});

// ============================================================================
// Deal schemas
// ============================================================================

export const createDealSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  stage_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  stage_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  status: z.enum(["open", "won", "lost"]).optional(),
  ai_win_probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().optional().nullable(),
  actual_close_date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const updateDealStageSchema = z.object({
  stage_id: z.string().uuid(),
});

// ============================================================================
// Task schemas
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  type: z.enum(["call", "email", "meeting", "follow_up", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  is_ai_generated: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["call", "email", "meeting", "follow_up", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  due_date: z.string().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
});

// ============================================================================
// Note schemas
// ============================================================================

export const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  is_pinned: z.boolean().optional(),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
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
  title: z.string().min(1),
  description: z.string().optional(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Search & Pipeline schemas
// ============================================================================

export const searchSchema = z.object({
  q: z.string().min(1),
  types: z.array(z.enum(["contact", "company", "deal"])).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export const createPipelineStageSchema = z.object({
  name: z.string().min(1),
  position: z.number().min(0),
  color: z.string().optional(),
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

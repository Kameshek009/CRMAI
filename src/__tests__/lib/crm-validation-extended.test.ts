import { describe, it, expect } from "vitest";
import {
  searchSchema,
  createPipelineStageSchema,
  reorderStagesSchema,
  bulkContactsSchema,
  bulkTasksSchema,
  bulkCompaniesSchema,
  bulkDealsSchema,
  createCallLogSchema,
  createSavedViewSchema,
  createEmailSchema,
  createGoalSchema,
  sendWhatsAppMessageSchema,
  createShowingSchema,
  bulkShowingsSchema,
} from "@/lib/crm/validation";

describe("searchSchema", () => {
  it("accepts valid search query", () => {
    const result = searchSchema.safeParse({ q: "alice" });
    expect(result.success).toBe(true);
  });

  it("rejects missing q", () => {
    const result = searchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty q", () => {
    const result = searchSchema.safeParse({ q: "" });
    expect(result.success).toBe(false);
  });

  it("accepts limit within bounds (1-50)", () => {
    const resultMin = searchSchema.safeParse({ q: "test", limit: 1 });
    expect(resultMin.success).toBe(true);

    const resultMax = searchSchema.safeParse({ q: "test", limit: 50 });
    expect(resultMax.success).toBe(true);

    const resultMid = searchSchema.safeParse({ q: "test", limit: 25 });
    expect(resultMid.success).toBe(true);
  });

  it("rejects limit below 1", () => {
    const result = searchSchema.safeParse({ q: "test", limit: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit above 50", () => {
    const result = searchSchema.safeParse({ q: "test", limit: 51 });
    expect(result.success).toBe(false);
  });

  it("accepts valid types array", () => {
    const result = searchSchema.safeParse({
      q: "test",
      types: ["contact", "company", "deal"],
    });
    expect(result.success).toBe(true);
  });
});

describe("createPipelineStageSchema", () => {
  it("accepts valid pipeline stage", () => {
    const result = createPipelineStageSchema.safeParse({
      name: "Qualified",
      position: 1,
    });
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = createPipelineStageSchema.safeParse({ position: 1 });
    expect(result.success).toBe(false);
  });

  it("requires position", () => {
    const result = createPipelineStageSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("accepts position at lower bound (0)", () => {
    const result = createPipelineStageSchema.safeParse({ name: "First", position: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts position at upper bound (100)", () => {
    const result = createPipelineStageSchema.safeParse({ name: "Last", position: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects position below 0", () => {
    const result = createPipelineStageSchema.safeParse({ name: "Invalid", position: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects position above 100", () => {
    const result = createPipelineStageSchema.safeParse({ name: "Invalid", position: 101 });
    expect(result.success).toBe(false);
  });

  it("accepts optional color, is_won, is_lost", () => {
    const result = createPipelineStageSchema.safeParse({
      name: "Won",
      position: 5,
      color: "#00ff00",
      is_won: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("reorderStagesSchema", () => {
  it("accepts valid stages array", () => {
    const result = reorderStagesSchema.safeParse({
      stages: [
        { id: "123e4567-e89b-12d3-a456-426614174000", position: 0 },
        { id: "223e4567-e89b-12d3-a456-426614174001", position: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("requires stages array", () => {
    const result = reorderStagesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid id", () => {
    const result = reorderStagesSchema.safeParse({
      stages: [{ id: "not-a-uuid", position: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative position", () => {
    const result = reorderStagesSchema.safeParse({
      stages: [{ id: "123e4567-e89b-12d3-a456-426614174000", position: -1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkContactsSchema", () => {
  const validIds = [
    "123e4567-e89b-12d3-a456-426614174000",
    "223e4567-e89b-12d3-a456-426614174001",
  ];

  it("accepts delete action", () => {
    const result = bulkContactsSchema.safeParse({
      action: "delete",
      ids: validIds,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update_status with valid status", () => {
    for (const status of ["lead", "active", "inactive", "churned"]) {
      const result = bulkContactsSchema.safeParse({
        action: "update_status",
        ids: validIds,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty ids array", () => {
    const result = bulkContactsSchema.safeParse({
      action: "delete",
      ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 100 ids", () => {
    const manyIds = Array.from({ length: 101 }, () => "123e4567-e89b-12d3-a456-426614174000");
    const result = bulkContactsSchema.safeParse({
      action: "delete",
      ids: manyIds,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action", () => {
    const result = bulkContactsSchema.safeParse({
      action: "invalid_action",
      ids: validIds,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status in update_status", () => {
    const result = bulkContactsSchema.safeParse({
      action: "update_status",
      ids: validIds,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkTasksSchema", () => {
  const validIds = ["123e4567-e89b-12d3-a456-426614174000"];

  it("accepts delete action", () => {
    const result = bulkTasksSchema.safeParse({
      action: "delete",
      ids: validIds,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update_status with valid status", () => {
    for (const status of ["todo", "in_progress", "done", "cancelled"]) {
      const result = bulkTasksSchema.safeParse({
        action: "update_status",
        ids: validIds,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("bulkCompaniesSchema", () => {
  it("accepts delete action", () => {
    const result = bulkCompaniesSchema.safeParse({
      action: "delete",
      ids: ["123e4567-e89b-12d3-a456-426614174000"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects update_status (not supported for companies)", () => {
    const result = bulkCompaniesSchema.safeParse({
      action: "update_status",
      ids: ["123e4567-e89b-12d3-a456-426614174000"],
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkDealsSchema", () => {
  const validIds = ["123e4567-e89b-12d3-a456-426614174000"];

  it("accepts delete action", () => {
    const result = bulkDealsSchema.safeParse({
      action: "delete",
      ids: validIds,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update_status with won", () => {
    const result = bulkDealsSchema.safeParse({
      action: "update_status",
      ids: validIds,
      status: "won",
    });
    expect(result.success).toBe(true);
  });

  it("accepts update_status with lost", () => {
    const result = bulkDealsSchema.safeParse({
      action: "update_status",
      ids: validIds,
      status: "lost",
    });
    expect(result.success).toBe(true);
  });

  it("accepts update_status with open", () => {
    const result = bulkDealsSchema.safeParse({
      action: "update_status",
      ids: validIds,
      status: "open",
    });
    expect(result.success).toBe(true);
  });
});

describe("createCallLogSchema", () => {
  it("accepts valid call log with all fields", () => {
    const result = createCallLogSchema.safeParse({
      contact_id: "123e4567-e89b-12d3-a456-426614174000",
      deal_id: "223e4567-e89b-12d3-a456-426614174001",
      direction: "outbound",
      status: "completed",
      duration_seconds: 300,
      from_number: "+12025551234",
      to_number: "+12025559999",
      summary: "Discussed pricing",
      recording_url: "https://example.com/recording.mp3",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid empty call log", () => {
    const result = createCallLogSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid direction values", () => {
    for (const direction of ["inbound", "outbound"]) {
      const result = createCallLogSchema.safeParse({ direction });
      expect(result.success).toBe(true);
    }
  });

  it("accepts valid status values", () => {
    for (const status of ["initiated", "completed", "missed", "no_answer", "busy", "voicemail", "cancelled"]) {
      const result = createCallLogSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects negative duration", () => {
    const result = createCallLogSchema.safeParse({ duration_seconds: -10 });
    expect(result.success).toBe(false);
  });
});

describe("createSavedViewSchema", () => {
  it("accepts valid saved view", () => {
    const result = createSavedViewSchema.safeParse({
      entity_type: "contacts",
      label: "My Leads",
    });
    expect(result.success).toBe(true);
  });

  it("requires entity_type", () => {
    const result = createSavedViewSchema.safeParse({ label: "Test" });
    expect(result.success).toBe(false);
  });

  it("requires label", () => {
    const result = createSavedViewSchema.safeParse({ entity_type: "contacts" });
    expect(result.success).toBe(false);
  });

  it("rejects empty label", () => {
    const result = createSavedViewSchema.safeParse({
      entity_type: "contacts",
      label: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid entity_type values", () => {
    for (const type of ["contacts", "leads", "deals", "organizations", "tasks", "call_logs", "notes"]) {
      const result = createSavedViewSchema.safeParse({
        entity_type: type,
        label: "Test View",
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts valid view_mode values", () => {
    for (const mode of ["table", "kanban", "group_by"]) {
      const result = createSavedViewSchema.safeParse({
        entity_type: "contacts",
        label: "Test",
        view_mode: mode,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid view_mode", () => {
    const result = createSavedViewSchema.safeParse({
      entity_type: "contacts",
      label: "Test",
      view_mode: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createSavedViewSchema.safeParse({
      entity_type: "deals",
      label: "Won Deals",
      icon: "trophy",
      filters: { status: "won" },
      sort_by: "created_at",
      sort_order: "desc",
      columns: ["title", "value"],
      is_pinned: true,
      is_public: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("createEmailSchema", () => {
  it("accepts valid email", () => {
    const result = createEmailSchema.safeParse({
      from_email: "sender@example.com",
      to_emails: ["recipient@example.com"],
      subject: "Hello",
      body_text: "Message body",
    });
    expect(result.success).toBe(true);
  });

  it("requires from_email", () => {
    const result = createEmailSchema.safeParse({
      to_emails: ["recipient@example.com"],
    });
    expect(result.success).toBe(false);
  });

  it("requires to_emails", () => {
    const result = createEmailSchema.safeParse({
      from_email: "sender@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty to_emails array", () => {
    const result = createEmailSchema.safeParse({
      from_email: "sender@example.com",
      to_emails: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple recipients", () => {
    const result = createEmailSchema.safeParse({
      from_email: "sender@example.com",
      to_emails: ["alice@example.com", "bob@example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts cc and bcc", () => {
    const result = createEmailSchema.safeParse({
      from_email: "sender@example.com",
      to_emails: ["recipient@example.com"],
      cc_emails: ["cc@example.com"],
      bcc_emails: ["bcc@example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional contact_id and deal_id", () => {
    const result = createEmailSchema.safeParse({
      from_email: "sender@example.com",
      to_emails: ["recipient@example.com"],
      contact_id: "123e4567-e89b-12d3-a456-426614174000",
      deal_id: "223e4567-e89b-12d3-a456-426614174001",
    });
    expect(result.success).toBe(true);
  });
});

describe("createGoalSchema", () => {
  it("accepts valid goal", () => {
    const result = createGoalSchema.safeParse({
      type: "revenue",
      target_value: 100000,
      period: "Q1 2026",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    expect(result.success).toBe(true);
  });

  it("requires type", () => {
    const result = createGoalSchema.safeParse({
      target_value: 100000,
      period: "Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    expect(result.success).toBe(false);
  });

  it("requires target_value", () => {
    const result = createGoalSchema.safeParse({
      type: "revenue",
      period: "Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    expect(result.success).toBe(false);
  });

  it("requires period", () => {
    const result = createGoalSchema.safeParse({
      type: "revenue",
      target_value: 100000,
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    expect(result.success).toBe(false);
  });

  it("requires start_date and end_date", () => {
    const result = createGoalSchema.safeParse({
      type: "revenue",
      target_value: 100000,
      period: "Q1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative target_value", () => {
    const result = createGoalSchema.safeParse({
      type: "revenue",
      target_value: -1000,
      period: "Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all goal types", () => {
    for (const type of ["revenue", "deals_won", "deals_created", "contacts_created", "activities_logged"]) {
      const result = createGoalSchema.safeParse({
        type,
        target_value: 50,
        period: "Q1",
        start_date: "2026-01-01",
        end_date: "2026-03-31",
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts account_id as self, uuid, or null", () => {
    const resultSelf = createGoalSchema.safeParse({
      type: "revenue",
      target_value: 100000,
      period: "Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
      account_id: "self",
    });
    expect(resultSelf.success).toBe(true);

    const resultUuid = createGoalSchema.safeParse({
      type: "revenue",
      target_value: 100000,
      period: "Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
      account_id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(resultUuid.success).toBe(true);

    const resultNull = createGoalSchema.safeParse({
      type: "revenue",
      target_value: 100000,
      period: "Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
      account_id: null,
    });
    expect(resultNull.success).toBe(true);
  });
});

describe("sendWhatsAppMessageSchema", () => {
  it("accepts valid WhatsApp message", () => {
    const result = sendWhatsAppMessageSchema.safeParse({
      to_number: "+12025551234",
      content: "Hello from WhatsApp",
    });
    expect(result.success).toBe(true);
  });

  it("requires to_number", () => {
    const result = sendWhatsAppMessageSchema.safeParse({
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty to_number", () => {
    const result = sendWhatsAppMessageSchema.safeParse({
      to_number: "",
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional contact_id and lead_id", () => {
    const result = sendWhatsAppMessageSchema.safeParse({
      to_number: "+12025551234",
      contact_id: "123e4567-e89b-12d3-a456-426614174000",
      lead_id: "223e4567-e89b-12d3-a456-426614174001",
    });
    expect(result.success).toBe(true);
  });

  it("accepts template message", () => {
    const result = sendWhatsAppMessageSchema.safeParse({
      to_number: "+12025551234",
      message_type: "template",
      template_name: "greeting",
      template_params: ["John", "Doe"],
    });
    expect(result.success).toBe(true);
  });
});

describe("createShowingSchema", () => {
  it("accepts valid showing", () => {
    const result = createShowingSchema.safeParse({
      title: "Property Tour",
      address: "123 Main St, City, State 12345",
      showing_date: "2026-03-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("requires title", () => {
    const result = createShowingSchema.safeParse({
      address: "123 Main St",
      showing_date: "2026-03-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("requires address", () => {
    const result = createShowingSchema.safeParse({
      title: "Tour",
      showing_date: "2026-03-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("requires showing_date", () => {
    const result = createShowingSchema.safeParse({
      title: "Tour",
      address: "123 Main St",
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration at lower bound (15 minutes)", () => {
    const result = createShowingSchema.safeParse({
      title: "Tour",
      address: "123 Main St",
      showing_date: "2026-03-01T10:00:00Z",
      duration_minutes: 15,
    });
    expect(result.success).toBe(true);
  });

  it("accepts duration at upper bound (480 minutes)", () => {
    const result = createShowingSchema.safeParse({
      title: "Tour",
      address: "123 Main St",
      showing_date: "2026-03-01T10:00:00Z",
      duration_minutes: 480,
    });
    expect(result.success).toBe(true);
  });

  it("rejects duration below 15", () => {
    const result = createShowingSchema.safeParse({
      title: "Tour",
      address: "123 Main St",
      showing_date: "2026-03-01T10:00:00Z",
      duration_minutes: 14,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration above 480", () => {
    const result = createShowingSchema.safeParse({
      title: "Tour",
      address: "123 Main St",
      showing_date: "2026-03-01T10:00:00Z",
      duration_minutes: 481,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all status values", () => {
    for (const status of ["scheduled", "completed", "cancelled", "no_show"]) {
      const result = createShowingSchema.safeParse({
        title: "Tour",
        address: "123 Main St",
        showing_date: "2026-03-01T10:00:00Z",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional fields", () => {
    const result = createShowingSchema.safeParse({
      title: "Property Tour",
      address: "123 Main St",
      showing_date: "2026-03-01T10:00:00Z",
      duration_minutes: 60,
      contact_id: "123e4567-e89b-12d3-a456-426614174000",
      deal_id: "223e4567-e89b-12d3-a456-426614174001",
      agent_account_id: "323e4567-e89b-12d3-a456-426614174002",
      status: "scheduled",
      result_notes: "Client loved the property",
    });
    expect(result.success).toBe(true);
  });
});

describe("bulkShowingsSchema", () => {
  const validIds = ["123e4567-e89b-12d3-a456-426614174000"];

  it("accepts delete action", () => {
    const result = bulkShowingsSchema.safeParse({
      action: "delete",
      ids: validIds,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update_status action", () => {
    const result = bulkShowingsSchema.safeParse({
      action: "update_status",
      ids: validIds,
      status: "completed",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all status values in update_status", () => {
    for (const status of ["scheduled", "completed", "cancelled", "no_show"]) {
      const result = bulkShowingsSchema.safeParse({
        action: "update_status",
        ids: validIds,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

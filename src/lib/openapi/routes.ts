import { z } from "zod";
import { getRegistry } from "./registry";
import { createContactSchema, updateContactSchema } from "@/lib/crm/validation";

// Registration runs at module load — but ONLY when this module is imported,
// which happens inside `buildOpenAPIDocument()` after the registry has been
// initialised. Tests and the API route both go through that entry point.

const registry = getRegistry();

const ErrorResponse = registry.register(
  "ErrorResponse",
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
);

const Contact = registry.register(
  "Contact",
  z.object({
    id: z.string().uuid(),
    account_id: z.string().uuid(),
    team_id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    title: z.string().nullable(),
    company_id: z.string().uuid().nullable(),
    status: z.enum(["lead", "active", "inactive", "churned"]).nullable(),
    source: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    is_deleted: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
);

const CreateContactRequest = registry.register("CreateContactRequest", createContactSchema);
const UpdateContactRequest = registry.register("UpdateContactRequest", updateContactSchema);

const ListContactsResponse = z.object({
  success: z.literal(true),
  data: z.array(Contact),
  total: z.number().nullable(),
});

const SingleContactResponse = z.object({
  success: z.literal(true),
  data: Contact,
});

registry.registerPath({
  method: "get",
  path: "/api/crm/contacts",
  summary: "List contacts",
  description:
    "Returns contacts for the caller's workspace. Supports pagination, search, and sorting via query params.",
  tags: ["Contacts"],
  security: [{ apiKey: ["contacts:read"] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      sort: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of contacts",
      content: { "application/json": { schema: ListContactsResponse } },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    429: { description: "Rate limit exceeded", content: { "application/json": { schema: ErrorResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/crm/contacts",
  summary: "Create a contact",
  description:
    "Creates a new contact in the caller's workspace. Triggers automations and writes an audit log entry.",
  tags: ["Contacts"],
  security: [{ apiKey: ["contacts:create"] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateContactRequest } },
    },
  },
  responses: {
    200: {
      description: "Created contact",
      content: { "application/json": { schema: SingleContactResponse } },
    },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    402: { description: "Workspace plan limit reached", content: { "application/json": { schema: ErrorResponse } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/crm/contacts/{id}",
  summary: "Get a contact by ID",
  tags: ["Contacts"],
  security: [{ apiKey: ["contacts:read"] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Contact details (includes joined company info)",
      content: { "application/json": { schema: SingleContactResponse } },
    },
    400: { description: "Invalid ID format", content: { "application/json": { schema: ErrorResponse } } },
    404: { description: "Contact not found", content: { "application/json": { schema: ErrorResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/crm/contacts/{id}",
  summary: "Update a contact",
  description:
    "Partial update. Only provided fields are changed; audit log records the diff.",
  tags: ["Contacts"],
  security: [{ apiKey: ["contacts:update"] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      required: true,
      content: { "application/json": { schema: UpdateContactRequest } },
    },
  },
  responses: {
    200: {
      description: "Updated contact",
      content: { "application/json": { schema: SingleContactResponse } },
    },
    400: { description: "Validation error or invalid ID", content: { "application/json": { schema: ErrorResponse } } },
    404: { description: "Contact not found", content: { "application/json": { schema: ErrorResponse } } },
  },
});

// ---------------------------------------------------------------------------
// GDPR self-service (Phase 2 wave A, feature 1)
// ---------------------------------------------------------------------------

const SuccessResponse = z.object({ success: z.literal(true) });

registry.registerPath({
  method: "post",
  path: "/api/account/export",
  summary: "Download a full data export for the calling account",
  description:
    "Generates a JSON file containing all personal data and data from teams the account owns. Rate-limited to one successful export per 24 hours. Encrypted secrets are omitted.",
  tags: ["GDPR"],
  responses: {
    200: {
      description: "JSON file download (Content-Disposition: attachment)",
      content: { "application/json": { schema: z.unknown() } },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    404: { description: "Account not found", content: { "application/json": { schema: ErrorResponse } } },
    429: { description: "Export already generated within last 24h", content: { "application/json": { schema: ErrorResponse } } },
    500: { description: "Export failed", content: { "application/json": { schema: ErrorResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/account/delete-request",
  summary: "Schedule a permanent account deletion",
  description:
    "Marks the calling account for hard deletion after a 30-day grace period and deactivates it immediately. Refuses with 409 if the user is the sole owner of a team that still has other active members.",
  tags: ["GDPR"],
  responses: {
    200: {
      description: "Deletion scheduled",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            deletion_requested_at: z.string().datetime(),
            grace_period_days: z.number(),
          }),
        },
      },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    404: { description: "Account not found", content: { "application/json": { schema: ErrorResponse } } },
    409: {
      description: "Already scheduled, or ownership transfer required",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            error: z.string(),
            blocking_teams: z
              .array(
                z.object({
                  team_id: z.string().uuid(),
                  team_name: z.string(),
                  other_active_members: z.number(),
                }),
              )
              .optional(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/account/delete-cancel",
  summary: "Cancel a pending account deletion",
  description: "Clears the deletion request if the grace period has not yet expired.",
  tags: ["GDPR"],
  responses: {
    200: { description: "Deletion cancelled", content: { "application/json": { schema: SuccessResponse } } },
    400: { description: "No pending deletion", content: { "application/json": { schema: ErrorResponse } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    404: { description: "Account not found", content: { "application/json": { schema: ErrorResponse } } },
    410: { description: "Grace period expired", content: { "application/json": { schema: ErrorResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/account/cookie-consent",
  summary: "Record server-side cookie consent for the calling account",
  description:
    "Mirrors the client-side cookie into the account row so the controller has a server-side audit trail. Returns 204 for unauthenticated visitors.",
  tags: ["GDPR"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            analytics: z.boolean(),
            marketing: z.boolean(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Consent recorded",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            consent: z.object({
              essential: z.literal(true),
              analytics: z.boolean(),
              marketing: z.boolean(),
              ts: z.string().datetime(),
              version: z.number(),
            }),
          }),
        },
      },
    },
    204: { description: "Unauthenticated — consent stays in cookie only" },
    400: { description: "Invalid body", content: { "application/json": { schema: ErrorResponse } } },
  },
});

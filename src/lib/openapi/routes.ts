import { z } from "zod";
import { registry } from "./registry";
import { createContactSchema, updateContactSchema } from "@/lib/crm/validation";

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
  description: "Returns contacts for the caller's workspace. Supports pagination, search, and sorting via query params.",
  tags: ["Contacts"],
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
  description: "Creates a new contact in the caller's workspace. Triggers automations and writes an audit log entry.",
  tags: ["Contacts"],
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
  description: "Partial update. Only provided fields are changed; audit log records the diff.",
  tags: ["Contacts"],
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

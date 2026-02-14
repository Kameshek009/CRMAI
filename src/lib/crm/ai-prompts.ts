/**
 * CRM AI system prompt and tool definitions for Groq function calling
 */

export const CRM_SYSTEM_PROMPT = `You are the Nexxus CRM AI assistant. You help sales teams manage their contacts, deals, and pipeline efficiently.

You can perform these actions:
- Create, search, and update contacts
- Create and manage deals
- Create tasks
- Search across the CRM
- Get pipeline summaries and insights

When a user asks you to do something, use the appropriate tool. Be concise and helpful.
When creating entities, confirm what you created. If information is ambiguous, ask for clarification.
Always respond in the same language the user writes in.`;

export const CRM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_contact",
      description: "Create a new contact in the CRM",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Contact's first name" },
          last_name: { type: "string", description: "Contact's last name" },
          email: { type: "string", description: "Contact's email address" },
          phone: { type: "string", description: "Contact's phone number" },
          title: { type: "string", description: "Job title" },
          company_name: { type: "string", description: "Company name (will find or create)" },
          source: { type: "string", description: "Lead source (website, referral, cold_call, etc.)" },
        },
        required: ["first_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_deal",
      description: "Create a new deal in the pipeline",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Deal title" },
          value: { type: "number", description: "Deal value in dollars" },
          contact_name: { type: "string", description: "Contact name to link to" },
          company_name: { type: "string", description: "Company name to link to" },
          stage_name: { type: "string", description: "Pipeline stage name (Lead, Qualified, Proposal, Negotiation)" },
          expected_close_date: { type: "string", description: "Expected close date (YYYY-MM-DD)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_task",
      description: "Create a task linked to a contact or deal",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          type: { type: "string", enum: ["call", "email", "meeting", "follow_up", "other"], description: "Task type" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Task priority" },
          due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
          contact_name: { type: "string", description: "Contact name to link to" },
          deal_title: { type: "string", description: "Deal title to link to" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_crm",
      description: "Search across contacts, companies, and deals",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          types: {
            type: "array",
            items: { type: "string", enum: ["contact", "company", "deal"] },
            description: "Entity types to search (defaults to all)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_pipeline_summary",
      description: "Get a summary of the current deal pipeline",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_deal_stage",
      description: "Move a deal to a different pipeline stage",
      parameters: {
        type: "object",
        properties: {
          deal_title: { type: "string", description: "Title of the deal to move" },
          stage_name: { type: "string", description: "Target stage name" },
        },
        required: ["deal_title", "stage_name"],
      },
    },
  },
];

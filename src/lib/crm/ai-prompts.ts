/**
 * CRM AI system prompt and tool definitions for Groq function calling
 */

export const CRM_SYSTEM_PROMPT = `You are the Nexxus CRM AI assistant. You help sales teams manage their contacts, deals, and pipeline.

RULES:
1. When the user asks to create, add, update, delete, or complete something — use the appropriate tool silently. Do NOT mention tool/function names in your responses. Instead, describe what you did in natural language (e.g. "Done! I created 5 contacts for you.").
2. When describing your capabilities, speak naturally: "I can create contacts, deals, tasks, search your CRM, and show pipeline stats" — NEVER write technical names like create_contact or <function>.
3. Always respond in the same language the user writes in.
4. Be concise and friendly.

You can:
- Create contacts (with name, email, phone, company, etc.)
- Update existing contacts (change email, phone, status, company, etc.)
- Create deals in the pipeline (with value, stage, expected close date)
- Update deals (change value, stage, status, close date)
- Create tasks (calls, emails, meetings, follow-ups)
- Update tasks (change priority, due date, status)
- Complete tasks
- Delete contacts, deals, or tasks
- Get detailed info about a specific contact or deal
- List upcoming or overdue tasks
- Search across contacts, companies, and deals
- Show pipeline summary and stats
- Show recent activity feed`;

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
  // --- Phase 2: New tools ---
  {
    type: "function" as const,
    function: {
      name: "update_contact",
      description: "Update an existing contact's information",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Contact name to find (searches first and last name)" },
          contact_id: { type: "string", description: "Contact UUID (if known)" },
          first_name: { type: "string", description: "New first name" },
          last_name: { type: "string", description: "New last name" },
          email: { type: "string", description: "New email address" },
          phone: { type: "string", description: "New phone number" },
          title: { type: "string", description: "New job title" },
          status: { type: "string", enum: ["lead", "active", "inactive", "churned"], description: "Contact status" },
          company_name: { type: "string", description: "Company name (will find or create)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_deal",
      description: "Update an existing deal's information",
      parameters: {
        type: "object",
        properties: {
          deal_title: { type: "string", description: "Deal title to find" },
          deal_id: { type: "string", description: "Deal UUID (if known)" },
          new_title: { type: "string", description: "New deal title" },
          value: { type: "number", description: "New deal value in dollars" },
          stage_name: { type: "string", description: "New pipeline stage name" },
          status: { type: "string", enum: ["open", "won", "lost"], description: "Deal status" },
          expected_close_date: { type: "string", description: "New expected close date (YYYY-MM-DD)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_task",
      description: "Update an existing task's information",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Task title to find" },
          task_id: { type: "string", description: "Task UUID (if known)" },
          new_title: { type: "string", description: "New task title" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "New priority" },
          due_date: { type: "string", description: "New due date (YYYY-MM-DD)" },
          status: { type: "string", enum: ["todo", "in_progress", "done", "cancelled"], description: "New task status" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "complete_task",
      description: "Mark a task as completed",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Task title to find" },
          task_id: { type: "string", description: "Task UUID (if known)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_record",
      description: "Delete a contact, deal, or task from the CRM",
      parameters: {
        type: "object",
        properties: {
          record_type: { type: "string", enum: ["contact", "deal", "task"], description: "Type of record to delete" },
          record_name: { type: "string", description: "Name/title of the record to find" },
          record_id: { type: "string", description: "Record UUID (if known)" },
        },
        required: ["record_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_contact_details",
      description: "Get detailed information about a specific contact",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Contact name to find" },
          contact_id: { type: "string", description: "Contact UUID (if known)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_deal_details",
      description: "Get detailed information about a specific deal",
      parameters: {
        type: "object",
        properties: {
          deal_title: { type: "string", description: "Deal title to find" },
          deal_id: { type: "string", description: "Deal UUID (if known)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_upcoming_tasks",
      description: "List upcoming, today's, or overdue tasks",
      parameters: {
        type: "object",
        properties: {
          timeframe: { type: "string", enum: ["today", "this_week", "overdue"], description: "Timeframe to filter tasks" },
        },
        required: ["timeframe"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_activity_feed",
      description: "Get recent CRM activity feed",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of activities to return (max 20, default 10)" },
        },
        required: [],
      },
    },
  },
];

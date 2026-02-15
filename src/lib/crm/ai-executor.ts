import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ensureDealStages } from "./helpers";

/**
 * Execute a CRM AI tool call and return the result
 */
export async function executeCrmToolCall(
  accountId: string,
  teamId: string,
  functionName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: string; data?: unknown }> {
  const supabase = createSupabaseAdmin();

  switch (functionName) {
    case "create_contact":
      return createContact(supabase, accountId, teamId, args);
    case "create_deal":
      return createDeal(supabase, accountId, teamId, args);
    case "create_task":
      return createTask(supabase, accountId, teamId, args);
    case "search_crm":
      return searchCrm(supabase, accountId, teamId, args);
    case "get_pipeline_summary":
      return getPipelineSummary(supabase, accountId, teamId);
    // Phase 2 tools
    case "update_contact":
      return updateContact(supabase, accountId, teamId, args);
    case "update_deal":
      return updateDeal(supabase, accountId, teamId, args);
    case "update_task":
      return updateTask(supabase, accountId, teamId, args);
    case "complete_task":
      return completeTask(supabase, accountId, teamId, args);
    case "delete_record":
      return deleteRecord(supabase, accountId, teamId, args);
    case "get_contact_details":
      return getContactDetails(supabase, accountId, teamId, args);
    case "get_deal_details":
      return getDealDetails(supabase, accountId, teamId, args);
    case "list_upcoming_tasks":
      return listUpcomingTasks(supabase, accountId, teamId, args);
    case "get_activity_feed":
      return getActivityFeed(supabase, accountId, teamId, args);
    default:
      return { success: false, result: `Unknown function: ${functionName}` };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = ReturnType<typeof createSupabaseAdmin>;

// ─── Helpers ────────────────────────────────────────────────

async function findOrCreateCompany(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  companyName: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .ilike("name", String(companyName))
    .eq("is_deleted", false)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: newCompany } = await supabase
    .from("companies")
    .insert({ account_id: accountId, team_id: teamId, name: String(companyName) })
    .select("id")
    .single();

  return newCompany?.id || null;
}

// ─── Existing tool handlers (updated with teamId) ──────────

async function createContact(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let companyId: string | null = null;

  if (args.company_name) {
    companyId = await findOrCreateCompany(supabase, accountId, teamId, String(args.company_name));
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      account_id: accountId,
      team_id: teamId,
      first_name: String(args.first_name || ""),
      last_name: args.last_name ? String(args.last_name) : null,
      email: args.email ? String(args.email) : null,
      phone: args.phone ? String(args.phone) : null,
      title: args.title ? String(args.title) : null,
      company_id: companyId,
      source: args.source ? String(args.source) : null,
    })
    .select("id, first_name, last_name, email")
    .single();

  if (error) {
    return { success: false, result: `Failed to create contact: ${error.message}` };
  }

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    contact_id: contact.id,
    company_id: companyId,
    type: "contact_created",
    title: `Contact created: ${contact.first_name} ${contact.last_name || ""}`.trim(),
  });

  const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
  return {
    success: true,
    result: `Created contact "${name}"${contact.email ? ` (${contact.email})` : ""}`,
    data: contact,
  };
}

async function createDeal(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  await ensureDealStages(accountId, teamId);

  let stageId: string;
  const stageName = String(args.stage_name || "Lead");
  const { data: stage } = await supabase
    .from("deal_stages")
    .select("id")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .ilike("name", stageName)
    .limit(1)
    .single();

  if (stage) {
    stageId = stage.id;
  } else {
    const { data: firstStage } = await supabase
      .from("deal_stages")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .order("position", { ascending: true })
      .limit(1)
      .single();
    stageId = firstStage?.id || "";
  }

  let contactId: string | null = null;
  if (args.contact_name) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .or(`first_name.ilike.%${args.contact_name}%,last_name.ilike.%${args.contact_name}%`)
      .limit(1)
      .single();
    contactId = contact?.id || null;
  }

  let companyId: string | null = null;
  if (args.company_name) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .ilike("name", `%${args.company_name}%`)
      .eq("is_deleted", false)
      .limit(1)
      .single();
    companyId = company?.id || null;
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      account_id: accountId,
      team_id: teamId,
      stage_id: stageId,
      title: String(args.title),
      value: Number(args.value) || 0,
      contact_id: contactId,
      company_id: companyId,
      expected_close_date: args.expected_close_date ? String(args.expected_close_date) : null,
    })
    .select("id, title, value")
    .single();

  if (error) {
    return { success: false, result: `Failed to create deal: ${error.message}` };
  }

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    deal_id: deal.id,
    contact_id: contactId,
    company_id: companyId,
    type: "deal_created",
    title: `Deal created: ${deal.title}`,
    metadata: { value: deal.value, stage: stageName },
  });

  return {
    success: true,
    result: `Created deal "${deal.title}" ($${Number(deal.value).toLocaleString()}) in ${stageName}`,
    data: deal,
  };
}

async function createTask(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let contactId: string | null = null;
  if (args.contact_name) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .or(`first_name.ilike.%${args.contact_name}%,last_name.ilike.%${args.contact_name}%`)
      .limit(1)
      .single();
    contactId = contact?.id || null;
  }

  let dealId: string | null = null;
  if (args.deal_title) {
    const { data: deal } = await supabase
      .from("deals")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .ilike("title", `%${args.deal_title}%`)
      .eq("is_deleted", false)
      .limit(1)
      .single();
    dealId = deal?.id || null;
  }

  const { data: task, error } = await supabase
    .from("crm_tasks")
    .insert({
      account_id: accountId,
      team_id: teamId,
      title: String(args.title),
      type: (args.type as string) || "other",
      priority: (args.priority as string) || "medium",
      due_date: args.due_date ? String(args.due_date) : null,
      contact_id: contactId,
      deal_id: dealId,
      is_ai_generated: true,
    })
    .select("id, title")
    .single();

  if (error) {
    return { success: false, result: `Failed to create task: ${error.message}` };
  }

  return {
    success: true,
    result: `Created task "${task.title}"${args.due_date ? ` due ${args.due_date}` : ""}`,
    data: task,
  };
}

async function searchCrm(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  const query = String(args.query);
  const types = (args.types as string[]) || ["contact", "company", "deal"];
  const results: { type: string; id: string; title: string; subtitle: string }[] = [];

  if (types.includes("contact")) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, title")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5);

    contacts?.forEach((c) =>
      results.push({
        type: "contact",
        id: c.id,
        title: `${c.first_name} ${c.last_name || ""}`.trim(),
        subtitle: c.email || c.title || "",
      })
    );
  }

  if (types.includes("company")) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, industry")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .ilike("name", `%${query}%`)
      .limit(5);

    companies?.forEach((c) =>
      results.push({ type: "company", id: c.id, title: c.name, subtitle: c.industry || "" })
    );
  }

  if (types.includes("deal")) {
    const { data: deals } = await supabase
      .from("deals")
      .select("id, title, value, status")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .ilike("title", `%${query}%`)
      .limit(5);

    deals?.forEach((d) =>
      results.push({
        type: "deal",
        id: d.id,
        title: d.title,
        subtitle: `$${Number(d.value).toLocaleString()} — ${d.status}`,
      })
    );
  }

  if (results.length === 0) {
    return { success: true, result: `No results found for "${query}"`, data: [] };
  }

  const summary = results
    .map((r) => `[${r.type}] ${r.title} — ${r.subtitle}`)
    .join("\n");

  return { success: true, result: `Found ${results.length} result(s):\n${summary}`, data: results };
}

async function getPipelineSummary(supabase: SupabaseClient, accountId: string, teamId: string) {
  await ensureDealStages(accountId, teamId);

  const { data: stages } = await supabase
    .from("deal_stages")
    .select("id, name, position, is_won, is_lost")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .order("position", { ascending: true });

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, status, ai_win_probability")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false)
    .eq("status", "open");

  if (!stages || !deals) {
    return { success: true, result: "No pipeline data available", data: null };
  }

  let totalValue = 0;
  let weightedValue = 0;
  const summary = stages
    .filter((s) => !s.is_won && !s.is_lost)
    .map((stage) => {
      const stageDeals = deals.filter((d) => d.stage_id === stage.id);
      const stageValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);
      const stageWeighted = stageDeals.reduce(
        (sum, d) => sum + Number(d.value) * (d.ai_win_probability / 100),
        0
      );
      totalValue += stageValue;
      weightedValue += stageWeighted;
      return `${stage.name}: ${stageDeals.length} deal(s), $${stageValue.toLocaleString()}`;
    })
    .join("\n");

  return {
    success: true,
    result: `Pipeline Summary:\n${summary}\n\nTotal: $${totalValue.toLocaleString()} | Weighted: $${Math.round(weightedValue).toLocaleString()}`,
    data: { stages, deals, totalValue, weightedValue },
  };
}

// ─── Phase 2: New tool handlers ─────────────────────────────

async function updateContact(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  // Find contact by id or name
  let contactQuery = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, title, status, company_id")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (args.contact_id) {
    contactQuery = contactQuery.eq("id", String(args.contact_id));
  } else if (args.contact_name) {
    const name = String(args.contact_name);
    contactQuery = contactQuery.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
  } else {
    return { success: false, result: "Please provide a contact name or ID to update." };
  }

  const { data: contact, error: findError } = await contactQuery.limit(1).single();

  if (findError || !contact) {
    return { success: false, result: "Contact not found." };
  }

  // Build update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const changes: string[] = [];

  if (args.first_name !== undefined) {
    updates.first_name = String(args.first_name);
    changes.push(`first name -> "${args.first_name}"`);
  }
  if (args.last_name !== undefined) {
    updates.last_name = String(args.last_name);
    changes.push(`last name -> "${args.last_name}"`);
  }
  if (args.email !== undefined) {
    updates.email = String(args.email);
    changes.push(`email -> "${args.email}"`);
  }
  if (args.phone !== undefined) {
    updates.phone = String(args.phone);
    changes.push(`phone -> "${args.phone}"`);
  }
  if (args.title !== undefined) {
    updates.title = String(args.title);
    changes.push(`title -> "${args.title}"`);
  }
  if (args.status !== undefined) {
    updates.status = String(args.status);
    changes.push(`status -> "${args.status}"`);
  }
  if (args.company_name !== undefined) {
    const companyId = await findOrCreateCompany(supabase, accountId, teamId, String(args.company_name));
    if (companyId) {
      updates.company_id = companyId;
      changes.push(`company -> "${args.company_name}"`);
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, result: "No fields to update were provided." };
  }

  updates.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", contact.id);

  if (updateError) {
    return { success: false, result: `Failed to update contact: ${updateError.message}` };
  }

  const contactName = `${contact.first_name} ${contact.last_name || ""}`.trim();

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    contact_id: contact.id,
    type: "contact_updated",
    title: `Contact updated: ${contactName}`,
    metadata: { changes },
  });

  return {
    success: true,
    result: `Updated contact "${contactName}": ${changes.join(", ")}`,
    data: { id: contact.id, changes },
  };
}

async function updateDeal(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let dealQuery = supabase
    .from("deals")
    .select("id, title, value, status, stage_id, expected_close_date")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (args.deal_id) {
    dealQuery = dealQuery.eq("id", String(args.deal_id));
  } else if (args.deal_title) {
    dealQuery = dealQuery.ilike("title", `%${args.deal_title}%`);
  } else {
    return { success: false, result: "Please provide a deal title or ID to update." };
  }

  const { data: deal, error: findError } = await dealQuery.limit(1).single();

  if (findError || !deal) {
    return { success: false, result: "Deal not found." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const changes: string[] = [];

  if (args.new_title !== undefined) {
    updates.title = String(args.new_title);
    changes.push(`title -> "${args.new_title}"`);
  }
  if (args.value !== undefined) {
    updates.value = Number(args.value);
    changes.push(`value -> $${Number(args.value).toLocaleString()}`);
  }
  if (args.expected_close_date !== undefined) {
    updates.expected_close_date = String(args.expected_close_date);
    changes.push(`expected close -> ${args.expected_close_date}`);
  }
  if (args.stage_name !== undefined) {
    const { data: stage } = await supabase
      .from("deal_stages")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .ilike("name", String(args.stage_name))
      .limit(1)
      .single();

    if (stage) {
      updates.stage_id = stage.id;
      changes.push(`stage -> "${args.stage_name}"`);
    } else {
      changes.push(`stage "${args.stage_name}" not found, skipped`);
    }
  }
  if (args.status !== undefined) {
    updates.status = String(args.status);
    changes.push(`status -> "${args.status}"`);
    if (args.status === "won") {
      updates.actual_close_date = new Date().toISOString().split("T")[0];
      changes.push("actual close date set to today");
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, result: "No fields to update were provided." };
  }

  updates.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", deal.id);

  if (updateError) {
    return { success: false, result: `Failed to update deal: ${updateError.message}` };
  }

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    deal_id: deal.id,
    type: "deal_updated",
    title: `Deal updated: ${deal.title}`,
    metadata: { changes },
  });

  return {
    success: true,
    result: `Updated deal "${deal.title}": ${changes.join(", ")}`,
    data: { id: deal.id, changes },
  };
}

async function updateTask(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let taskQuery = supabase
    .from("crm_tasks")
    .select("id, title, status, priority, due_date")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (args.task_id) {
    taskQuery = taskQuery.eq("id", String(args.task_id));
  } else if (args.task_title) {
    taskQuery = taskQuery.ilike("title", `%${args.task_title}%`);
  } else {
    return { success: false, result: "Please provide a task title or ID to update." };
  }

  const { data: task, error: findError } = await taskQuery.limit(1).single();

  if (findError || !task) {
    return { success: false, result: "Task not found." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const changes: string[] = [];

  if (args.new_title !== undefined) {
    updates.title = String(args.new_title);
    changes.push(`title -> "${args.new_title}"`);
  }
  if (args.priority !== undefined) {
    updates.priority = String(args.priority);
    changes.push(`priority -> "${args.priority}"`);
  }
  if (args.due_date !== undefined) {
    updates.due_date = String(args.due_date);
    changes.push(`due date -> ${args.due_date}`);
  }
  if (args.status !== undefined) {
    updates.status = String(args.status);
    changes.push(`status -> "${args.status}"`);
    if (args.status === "done") {
      updates.completed_at = new Date().toISOString();
      changes.push("marked as completed");
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, result: "No fields to update were provided." };
  }

  updates.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("crm_tasks")
    .update(updates)
    .eq("id", task.id);

  if (updateError) {
    return { success: false, result: `Failed to update task: ${updateError.message}` };
  }

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    type: "task_updated",
    title: `Task updated: ${task.title}`,
    metadata: { changes },
  });

  return {
    success: true,
    result: `Updated task "${task.title}": ${changes.join(", ")}`,
    data: { id: task.id, changes },
  };
}

async function completeTask(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let taskQuery = supabase
    .from("crm_tasks")
    .select("id, title, status")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (args.task_id) {
    taskQuery = taskQuery.eq("id", String(args.task_id));
  } else if (args.task_title) {
    taskQuery = taskQuery.ilike("title", `%${args.task_title}%`);
  } else {
    return { success: false, result: "Please provide a task title or ID to complete." };
  }

  const { data: task, error: findError } = await taskQuery.limit(1).single();

  if (findError || !task) {
    return { success: false, result: "Task not found." };
  }

  if (task.status === "done") {
    return { success: true, result: `Task "${task.title}" is already completed.` };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("crm_tasks")
    .update({ status: "done", completed_at: now, updated_at: now })
    .eq("id", task.id);

  if (updateError) {
    return { success: false, result: `Failed to complete task: ${updateError.message}` };
  }

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    type: "task_completed",
    title: `Task completed: ${task.title}`,
  });

  return {
    success: true,
    result: `Completed task "${task.title}"`,
    data: { id: task.id },
  };
}

async function deleteRecord(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  const recordType = String(args.record_type);

  const tableMap: Record<string, string> = {
    contact: "contacts",
    deal: "deals",
    task: "crm_tasks",
  };
  const table = tableMap[recordType];
  if (!table) {
    return { success: false, result: `Invalid record type: ${recordType}` };
  }

  // Find the record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let record: any = null;

  if (recordType === "contact") {
    let q = supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false);
    if (args.record_id) {
      q = q.eq("id", String(args.record_id));
    } else if (args.record_name) {
      const name = String(args.record_name);
      q = q.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
    } else {
      return { success: false, result: "Please provide a name/title or ID of the record to delete." };
    }
    const { data, error: fe } = await q.limit(1).single();
    if (fe || !data) return { success: false, result: "Contact not found." };
    record = data;
  } else {
    const tbl = recordType === "deal" ? "deals" as const : "crm_tasks" as const;
    let q = supabase
      .from(tbl)
      .select("id, title")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .eq("is_deleted", false);
    if (args.record_id) {
      q = q.eq("id", String(args.record_id));
    } else if (args.record_name) {
      q = q.ilike("title", `%${args.record_name}%`);
    } else {
      return { success: false, result: "Please provide a name/title or ID of the record to delete." };
    }
    const { data, error: fe } = await q.limit(1).single();
    if (fe || !data || typeof data === 'string') return { success: false, result: `${recordType} not found.` };
    record = data;
  }

  // Soft delete
  const now = new Date().toISOString();
  const { error: delError } = await supabase
    .from(table)
    .update({ is_deleted: true, updated_at: now } as never)
    .eq("id" as never, record.id as never);

  if (delError) {
    return { success: false, result: `Failed to delete ${recordType}: ${delError.message}` };
  }

  const recordName = recordType === "contact"
    ? `${record.first_name} ${record.last_name || ""}`.trim()
    : record.title;

  await supabase.from("crm_activities").insert({
    account_id: accountId,
    team_id: teamId,
    type: `${recordType}_deleted`,
    title: `${recordType.charAt(0).toUpperCase() + recordType.slice(1)} deleted: ${recordName}`,
  });

  return {
    success: true,
    result: `Deleted ${recordType} "${recordName}"`,
    data: { id: record.id },
  };
}

async function getContactDetails(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let contactQuery = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, title, status, engagement_score, source, created_at, company_id, companies(name)")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (args.contact_id) {
    contactQuery = contactQuery.eq("id", String(args.contact_id));
  } else if (args.contact_name) {
    const name = String(args.contact_name);
    contactQuery = contactQuery.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
  } else {
    return { success: false, result: "Please provide a contact name or ID." };
  }

  const { data: contact, error } = await contactQuery.limit(1).single();

  if (error || !contact) {
    return { success: false, result: "Contact not found." };
  }

  const fullName = `${contact.first_name} ${contact.last_name || ""}`.trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyName = (contact.companies as any)?.name || "None";

  const details = [
    `**${fullName}**`,
    contact.title ? `Title: ${contact.title}` : null,
    `Email: ${contact.email || "N/A"}`,
    `Phone: ${contact.phone || "N/A"}`,
    `Company: ${companyName}`,
    `Status: ${contact.status || "lead"}`,
    `Engagement Score: ${contact.engagement_score ?? "N/A"}`,
    `Source: ${contact.source || "N/A"}`,
    `Created: ${new Date(contact.created_at).toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    success: true,
    result: details,
    data: contact,
  };
}

async function getDealDetails(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  let dealQuery = supabase
    .from("deals")
    .select("id, title, value, status, expected_close_date, actual_close_date, ai_win_probability, created_at, stage_id, contact_id, company_id, deal_stages(name), contacts(first_name, last_name), companies(name)")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (args.deal_id) {
    dealQuery = dealQuery.eq("id", String(args.deal_id));
  } else if (args.deal_title) {
    dealQuery = dealQuery.ilike("title", `%${args.deal_title}%`);
  } else {
    return { success: false, result: "Please provide a deal title or ID." };
  }

  const { data: deal, error } = await dealQuery.limit(1).single();

  if (error || !deal) {
    return { success: false, result: "Deal not found." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageName = (deal.deal_stages as any)?.name || "Unknown";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contact = deal.contacts as any;
  const contactName = contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : "None";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyName = (deal.companies as any)?.name || "None";

  const details = [
    `**${deal.title}**`,
    `Value: $${Number(deal.value).toLocaleString()}`,
    `Stage: ${stageName}`,
    `Status: ${deal.status}`,
    `Win Probability: ${deal.ai_win_probability ?? "N/A"}%`,
    `Contact: ${contactName}`,
    `Company: ${companyName}`,
    deal.expected_close_date ? `Expected Close: ${deal.expected_close_date}` : null,
    deal.actual_close_date ? `Actual Close: ${deal.actual_close_date}` : null,
    `Created: ${new Date(deal.created_at).toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    success: true,
    result: details,
    data: deal,
  };
}

async function listUpcomingTasks(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  const timeframe = String(args.timeframe || "this_week");
  const today = new Date().toISOString().split("T")[0];

  let tasksQuery = supabase
    .from("crm_tasks")
    .select("id, title, priority, due_date, type, status")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .eq("is_deleted", false);

  if (timeframe === "today") {
    tasksQuery = tasksQuery
      .eq("due_date", today)
      .not("status", "in", '("done","cancelled")');
  } else if (timeframe === "this_week") {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    tasksQuery = tasksQuery
      .gte("due_date", today)
      .lte("due_date", weekEndStr)
      .not("status", "in", '("done","cancelled")');
  } else if (timeframe === "overdue") {
    tasksQuery = tasksQuery
      .lt("due_date", today)
      .not("status", "in", '("done","cancelled")');
  }

  tasksQuery = tasksQuery.order("due_date", { ascending: true }).limit(20);

  const { data: tasks, error } = await tasksQuery;

  if (error) {
    return { success: false, result: `Failed to fetch tasks: ${error.message}` };
  }

  if (!tasks || tasks.length === 0) {
    const labels: Record<string, string> = {
      today: "today",
      this_week: "this week",
      overdue: "that are overdue",
    };
    return { success: true, result: `No tasks ${labels[timeframe] || timeframe}.`, data: [] };
  }

  const list = tasks
    .map((t) => {
      const dueStr = t.due_date ? ` (due ${t.due_date})` : "";
      return `- [${t.priority}] ${t.title}${dueStr} — ${t.type}`;
    })
    .join("\n");

  const labels: Record<string, string> = {
    today: "Today's",
    this_week: "This week's",
    overdue: "Overdue",
  };

  return {
    success: true,
    result: `${labels[timeframe] || "Upcoming"} tasks (${tasks.length}):\n${list}`,
    data: tasks,
  };
}

async function getActivityFeed(
  supabase: SupabaseClient,
  accountId: string,
  teamId: string,
  args: Record<string, unknown>
) {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);

  const { data: activities, error } = await supabase
    .from("crm_activities")
    .select("id, type, title, created_at")
    .eq("account_id", accountId)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, result: `Failed to fetch activities: ${error.message}` };
  }

  if (!activities || activities.length === 0) {
    return { success: true, result: "No recent activity.", data: [] };
  }

  const list = activities
    .map((a) => {
      const dateStr = new Date(a.created_at).toLocaleString();
      return `- ${a.title} (${dateStr})`;
    })
    .join("\n");

  return {
    success: true,
    result: `Recent activity (${activities.length}):\n${list}`,
    data: activities,
  };
}

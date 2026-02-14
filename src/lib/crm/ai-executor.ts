import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ensureDealStages } from "./helpers";

/**
 * Execute a CRM AI tool call and return the result
 */
export async function executeCrmToolCall(
  accountId: string,
  functionName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: string; data?: unknown }> {
  const supabase = createSupabaseAdmin();

  switch (functionName) {
    case "create_contact":
      return createContact(supabase, accountId, args);
    case "create_deal":
      return createDeal(supabase, accountId, args);
    case "create_task":
      return createTask(supabase, accountId, args);
    case "search_crm":
      return searchCrm(supabase, accountId, args);
    case "get_pipeline_summary":
      return getPipelineSummary(supabase, accountId);
    default:
      return { success: false, result: `Unknown function: ${functionName}` };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = ReturnType<typeof createSupabaseAdmin>;

async function createContact(
  supabase: SupabaseClient,
  accountId: string,
  args: Record<string, unknown>
) {
  let companyId: string | null = null;

  // If company_name is provided, find or create it
  if (args.company_name) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("account_id", accountId)
      .ilike("name", String(args.company_name))
      .eq("is_deleted", false)
      .limit(1)
      .single();

    if (existing) {
      companyId = existing.id;
    } else {
      const { data: newCompany } = await supabase
        .from("companies")
        .insert({ account_id: accountId, name: String(args.company_name) })
        .select("id")
        .single();
      companyId = newCompany?.id || null;
    }
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      account_id: accountId,
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

  // Log activity
  await supabase.from("crm_activities").insert({
    account_id: accountId,
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
  args: Record<string, unknown>
) {
  await ensureDealStages(accountId);

  // Find the stage
  let stageId: string;
  const stageName = String(args.stage_name || "Lead");
  const { data: stage } = await supabase
    .from("deal_stages")
    .select("id")
    .eq("account_id", accountId)
    .ilike("name", stageName)
    .limit(1)
    .single();

  if (stage) {
    stageId = stage.id;
  } else {
    // Default to first stage
    const { data: firstStage } = await supabase
      .from("deal_stages")
      .select("id")
      .eq("account_id", accountId)
      .order("position", { ascending: true })
      .limit(1)
      .single();
    stageId = firstStage?.id || "";
  }

  // Find linked contact
  let contactId: string | null = null;
  if (args.contact_name) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .or(`first_name.ilike.%${args.contact_name}%,last_name.ilike.%${args.contact_name}%`)
      .limit(1)
      .single();
    contactId = contact?.id || null;
  }

  // Find linked company
  let companyId: string | null = null;
  if (args.company_name) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("account_id", accountId)
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
  args: Record<string, unknown>
) {
  let contactId: string | null = null;
  if (args.contact_name) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
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

async function getPipelineSummary(supabase: SupabaseClient, accountId: string) {
  await ensureDealStages(accountId);

  const { data: stages } = await supabase
    .from("deal_stages")
    .select("id, name, position, is_won, is_lost")
    .eq("account_id", accountId)
    .order("position", { ascending: true });

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, status, ai_win_probability")
    .eq("account_id", accountId)
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


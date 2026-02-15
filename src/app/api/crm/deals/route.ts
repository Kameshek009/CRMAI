import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parsePagination, ensureDealStages } from "@/lib/crm/helpers";
import { createDealSchema } from "@/lib/crm/validation";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "read");
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const stageId = searchParams.get("stage_id");
    const contactId = searchParams.get("contact_id");
    const companyId = searchParams.get("company_id");

    const supabase = createSupabaseAdmin();
    await ensureDealStages(context.accountId, context.teamId);

    let query = supabase
      .from("deals")
      .select("*, deal_stages(id, name, color, position, is_won, is_lost), contacts(id, first_name, last_name), companies(id, name)", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (stageId) query = query.eq("stage_id", stageId);
    if (contactId) query = query.eq("contact_id", contactId);
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "create");
    if (permError) return permError;

    const body = await request.json();
    const parsed = createDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deals")
      .insert({ account_id: context.accountId, team_id: context.teamId, ...parsed.data })
      .select("*, deal_stages(id, name, color), contacts(id, first_name, last_name), companies(id, name)")
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("crm_activities").insert({
      account_id: context.accountId,
      team_id: context.teamId,
      deal_id: data.id,
      contact_id: data.contact_id,
      company_id: data.company_id,
      type: "deal_created",
      title: `Deal created: ${data.title}`,
      metadata: { value: data.value },
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

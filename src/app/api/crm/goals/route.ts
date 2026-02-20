import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const period = request.nextUrl.searchParams.get("period") || "all";
  const scope = request.nextUrl.searchParams.get("scope") || "all"; // my, team, all

  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("goals")
    .select("*")
    .eq("team_id", context.workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (period !== "all") {
    query = query.eq("period", period);
  }

  if (scope === "my") {
    query = query.eq("account_id", context.accountId);
  } else if (scope === "team") {
    query = query.is("account_id", null);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to fetch goals" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request: NextRequest) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const body = await request.json();
  const { type, target_value, period, start_date, end_date, account_id } = body;

  if (!type || !target_value || !period || !start_date || !end_date) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const validTypes = ["revenue", "deals_won", "deals_created", "contacts_created", "activities_logged"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ success: false, error: "Invalid goal type" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const { data, error: dbError } = await supabase
    .from("goals")
    .insert({
      team_id: context.workspaceId,
      account_id: account_id === "self" ? context.accountId : account_id || null,
      created_by: context.accountId,
      type,
      target_value,
      period,
      start_date,
      end_date,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to create goal" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

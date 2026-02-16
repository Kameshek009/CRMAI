import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateCompanySchema } from "@/lib/crm/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "read");
    if (permError) return permError;

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    const [companyResult, contactCountResult, dealCountResult] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .eq("team_id", context.teamId)
        .eq("is_deleted", false)
        .single(),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("team_id", context.teamId)
        .eq("is_deleted", false),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("team_id", context.teamId)
        .eq("is_deleted", false),
    ]);

    if (companyResult.error || !companyResult.data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...companyResult.data,
        contact_count: contactCountResult.count || 0,
        deal_count: dealCountResult.count || 0,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "update");
    if (permError) return permError;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("companies")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    await supabase.from("crm_activities").insert({
      account_id: context.accountId,
      team_id: context.teamId,
      company_id: id,
      type: "company_updated",
      title: `Company updated: ${data.name}`,
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "delete");
    if (permError) return permError;

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("companies")
      .select("name")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .single();

    const { error: dbError } = await supabase
      .from("companies")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("team_id", context.teamId);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    await supabase.from("crm_activities").insert({
      account_id: context.accountId,
      team_id: context.teamId,
      company_id: id,
      type: "company_deleted",
      title: `Company deleted: ${existing?.name || "Unknown"}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parsePagination } from "@/lib/crm/helpers";
import { createCompanySchema } from "@/lib/crm/validation";

/** Escape special LIKE/ILIKE characters to prevent injection */
function sanitizeLike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "read");
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const search = searchParams.get("search");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const s = sanitizeLike(search);
      query = query.or(`name.ilike.%${s}%,industry.ilike.%${s}%,domain.ilike.%${s}%`);
    }

    const { data, error: dbError, count } = await query;

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    console.error("[API crm/companies GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "create");
    if (permError) return permError;

    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("companies")
      .insert({ account_id: context.accountId, team_id: context.teamId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        company_id: data.id,
        type: "company_created",
        title: `Company created: ${data.name}`,
      });
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/companies POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

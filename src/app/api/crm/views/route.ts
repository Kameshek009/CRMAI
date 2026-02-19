import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { createSavedViewSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("saved_views")
      .select("*")
      .eq("team_id", context.teamId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (entityType) query = query.eq("entity_type", entityType);

    // Show public views + own views
    query = query.or(`is_public.eq.true,created_by_account_id.eq.${context.accountId}`);

    const { data, error: dbError } = await query;

    if (dbError) {
      logger.error("Views", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch views" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Views", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const body = await request.json();
    const parsed = createSavedViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("saved_views")
      .insert({
        team_id: context.teamId,
        created_by_account_id: context.accountId,
        ...parsed.data,
      })
      .select()
      .single();

    if (dbError) {
      logger.error("Views", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create view" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Views", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parsePagination } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read", context.isDirector);
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const contactId = searchParams.get("contact_id");
    const leadId = searchParams.get("lead_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (contactId) query = query.eq("contact_id", contactId);
    if (leadId) query = query.eq("lead_id", leadId);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("WhatsApp", "GET messages error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("WhatsApp", "GET messages error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

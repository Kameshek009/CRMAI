import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { bulkShowingsSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const body = await request.json();
    const parsed = bulkShowingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { action, ids } = parsed.data;

    if (action === "delete") {
      const permError = requirePermission(context.permissions, "deals", "delete", context.isDirector);
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("property_showings")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: context.accountId })
        .in("id", ids)
        .eq("team_id", context.teamId);

      if (dbError) {
        logger.error("Showings", "Bulk delete error", dbError);
        return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
      }
    } else if (action === "update_status") {
      const permError = requirePermission(context.permissions, "deals", "update", context.isDirector);
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("property_showings")
        .update({ status: parsed.data.status })
        .in("id", ids)
        .eq("team_id", context.teamId);

      if (dbError) {
        logger.error("Showings", "Bulk update error", dbError);
        return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    logger.error("Showings", "Bulk error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

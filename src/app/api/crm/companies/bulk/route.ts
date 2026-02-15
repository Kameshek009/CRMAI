import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { bulkCompaniesSchema } from "@/lib/crm/validation";

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const body = await request.json();
    const parsed = bulkCompaniesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { action, ids } = parsed.data;

    if (action === "delete") {
      const permError = requirePermission(context.permissions, "companies", "delete");
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("companies")
        .update({ is_deleted: true })
        .in("id", ids)
        .eq("team_id", context.teamId);

      if (dbError) {
        return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

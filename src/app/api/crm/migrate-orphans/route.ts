import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";

/**
 * One-time migration: fix orphaned records that were created
 * by the old AI executor without proper team_id.
 * Finds records with matching account_id but NULL/wrong team_id
 * and assigns them to the user's current team.
 */
export async function POST() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "write");
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { accountId, teamId } = context;

    const tables = ["contacts", "companies", "deals", "crm_tasks", "crm_activities"] as const;
    const results: Record<string, number> = {};

    for (const table of tables) {
      // Fix records with NULL team_id
      const { data: nullFixed } = await supabase
        .from(table)
        .update({ team_id: teamId } as never)
        .eq("account_id" as never, accountId as never)
        .is("team_id" as never, null as never)
        .select("id");

      // Fix records with empty string team_id
      const { data: emptyFixed } = await supabase
        .from(table)
        .update({ team_id: teamId } as never)
        .eq("account_id" as never, accountId as never)
        .eq("team_id" as never, "" as never)
        .select("id");

      results[table] = (nullFixed?.length || 0) + (emptyFixed?.length || 0);
    }

    // Also un-delete contacts that might have been soft-deleted by accident
    const { data: restoredData } = await supabase
      .from("contacts")
      .update({ is_deleted: false } as never)
      .eq("account_id" as never, accountId as never)
      .eq("team_id" as never, teamId as never)
      .eq("is_deleted" as never, true as never)
      .select("id");
    const restoredContacts = restoredData?.length || 0;

    const totalFixed = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Fixed ${totalFixed} orphaned records, restored ${restoredContacts || 0} deleted contacts`,
      details: results,
      restoredContacts: restoredContacts || 0,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

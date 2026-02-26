import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";

/**
 * One-time migration: fix orphaned records that were created
 * by the old AI executor without proper team_id.
 * Finds records with matching account_id but NULL/wrong team_id
 * and assigns them to the user's current team.
 */
export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "write" },
    logTag: "MigrateOrphans",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { accountId, workspaceId } = ctx;

    const tables = ["contacts", "companies", "deals", "crm_tasks", "crm_activities"];
    const results: Record<string, number> = {};

    for (const table of tables) {
      // Fix records with NULL team_id
      const { data: nullFixed } = await supabase
        .from(table)
        .update({ team_id: workspaceId })
        .eq("account_id", accountId)
        .is("team_id", null)
        .select("id");

      // Fix records with empty string team_id
      const { data: emptyFixed } = await supabase
        .from(table)
        .update({ team_id: workspaceId })
        .eq("account_id", accountId)
        .eq("team_id", "")
        .select("id");

      results[table] = (nullFixed?.length || 0) + (emptyFixed?.length || 0);
    }

    // Also un-delete contacts that might have been soft-deleted by accident
    const { data: restoredData } = await supabase
      .from("contacts")
      .update({ is_deleted: false })
      .eq("account_id", accountId)
      .eq("team_id", workspaceId)
      .eq("is_deleted", true)
      .select("id");
    const restoredContacts = restoredData?.length || 0;

    const totalFixed = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Fixed ${totalFixed} orphaned records, restored ${restoredContacts || 0} deleted contacts`,
      details: results,
      restoredContacts: restoredContacts || 0,
    });
  }
);

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Bulk-creates leads from a CSV import. Mirrors /api/crm/import (contacts)
// — the only structural difference is that leads keep `organization` as a
// free-text column instead of resolving to a companies row, so we skip the
// companies-batch step entirely.

const csvLeadSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).optional(),
  email: z.string().email().max(254).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  mobile: z.string().max(30).optional(),
  organization: z.string().max(200).optional(),
  job_title: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "junk"]).optional(),
  notes: z.string().max(10000).optional(),
});

const importSchema = z.object({
  leads: z.array(csvLeadSchema).min(1, "No leads provided").max(1000, "Maximum 1000 leads per import"),
});

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid import data", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdmin();
    const leadRows = parsed.data.leads.map((l) => ({
      account_id: context.accountId,
      team_id: context.teamId,
      lead_owner_account_id: context.accountId,
      first_name: l.first_name,
      last_name: l.last_name || null,
      email: l.email || null,
      phone: l.phone || null,
      mobile: l.mobile || null,
      organization: l.organization || null,
      job_title: l.job_title || null,
      source: l.source || "import",
      status: l.status || "new",
      notes: l.notes || null,
    }));

    const { data: imported, error: dbError } = await supabase
      .from("leads")
      .insert(leadRows)
      .select("id");

    if (dbError) {
      logger.error("Import", "Failed to import leads", dbError);
      return NextResponse.json({ success: false, error: "Failed to import leads" }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        type: "import",
        title: `Imported ${imported?.length || 0} leads`,
        metadata: { count: imported?.length || 0, entity: "leads" },
      });
    } catch (e) {
      logger.error("Import", "Failed to log lead import activity", e);
    }

    return NextResponse.json({
      success: true,
      data: { imported: imported?.length || 0 },
    });
  } catch (error) {
    logger.error("Import", "Unexpected error in leads import", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";
import { z } from "zod";

const csvContactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  source: z.string().max(50).optional(),
});

const importSchema = z.object({
  contacts: z.array(csvContactSchema).min(1, "No contacts provided").max(1000, "Maximum 1000 contacts per import"),
});

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid import data", details: parsed.error.issues }, { status: 400 });
    }

    const { contacts } = parsed.data;

    const supabase = createSupabaseAdmin();

    // Collect unique company names
    const companyNames = [...new Set(contacts.map((c) => c.company).filter(Boolean))] as string[];
    const companyMap = new Map<string, string>();

    if (companyNames.length > 0) {
      // Batch fetch existing companies in one query instead of N+1
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("id, name")
        .eq("team_id", context.teamId)
        .eq("is_deleted", false)
        .in("name", companyNames);

      if (existingCompanies) {
        for (const company of existingCompanies) {
          companyMap.set(company.name.toLowerCase(), company.id);
        }
      }

      // Create missing companies in a single batch insert
      const missingNames = companyNames.filter((n) => !companyMap.has(n.toLowerCase()));
      if (missingNames.length > 0) {
        const { data: created } = await supabase
          .from("companies")
          .insert(missingNames.map((name) => ({
            account_id: context.accountId,
            team_id: context.teamId,
            name,
          })))
          .select("id, name");

        if (created) {
          for (const company of created) {
            companyMap.set(company.name.toLowerCase(), company.id);
          }
        }
      }
    }

    // Insert contacts
    const contactRows = contacts.map((c) => ({
      account_id: context.accountId,
      team_id: context.teamId,
      first_name: c.first_name,
      last_name: c.last_name || null,
      email: c.email || null,
      phone: c.phone || null,
      title: c.title || null,
      company_id: c.company ? companyMap.get(c.company.toLowerCase()) || null : null,
      source: c.source || "import",
    }));

    const { data: imported, error: dbError } = await supabase
      .from("contacts")
      .insert(contactRows)
      .select("id");

    if (dbError) {
      logger.error("Import", "Failed to import contacts", dbError);
      return NextResponse.json({ success: false, error: "Failed to import contacts" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        type: "import",
        title: `Imported ${imported?.length || 0} contacts`,
        metadata: { count: imported?.length || 0, companies: companyNames.length },
      });
    } catch (e) {
      logger.warn("Import", "Failed to log import activity", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: imported?.length || 0,
        companies: companyNames.length,
      },
    });
  } catch (error) {
    logger.error("Import", "Unexpected error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

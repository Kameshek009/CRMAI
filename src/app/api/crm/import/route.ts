import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";

interface CsvContact {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "create");
    if (permError) return permError;

    const body = await request.json();
    const { contacts } = body as { contacts: CsvContact[] };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ success: false, error: "No contacts provided" }, { status: 400 });
    }

    if (contacts.length > 1000) {
      return NextResponse.json({ success: false, error: "Maximum 1000 contacts per import" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Collect unique company names
    const companyNames = [...new Set(contacts.map((c) => c.company).filter(Boolean))] as string[];
    const companyMap = new Map<string, string>();

    // Find or create companies
    for (const name of companyNames) {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("team_id", context.teamId)
        .ilike("name", name)
        .eq("is_deleted", false)
        .limit(1)
        .single();

      if (existing) {
        companyMap.set(name.toLowerCase(), existing.id);
      } else {
        const { data: created } = await supabase
          .from("companies")
          .insert({ account_id: context.accountId, team_id: context.teamId, name })
          .select("id")
          .single();
        if (created) {
          companyMap.set(name.toLowerCase(), created.id);
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
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("crm_activities").insert({
      account_id: context.accountId,
      team_id: context.teamId,
      type: "import",
      title: `Imported ${imported?.length || 0} contacts`,
      metadata: { count: imported?.length || 0, companies: companyNames.length },
    });

    return NextResponse.json({
      success: true,
      data: {
        imported: imported?.length || 0,
        companies: companyNames.length,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

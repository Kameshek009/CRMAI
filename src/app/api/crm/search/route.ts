import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { sanitizeLike } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const limit = Math.min(20, parseInt(searchParams.get("limit") || "10", 10));

    if (!q || q.length < 1) {
      return NextResponse.json({ success: false, error: "Query required" }, { status: 400 });
    }

    if (q.length > 100) {
      return NextResponse.json({ success: false, error: "Query too long" }, { status: 400 });
    }

    const sq = sanitizeLike(q);

    const supabase = createSupabaseAdmin();
    const results: { type: string; id: string; title: string; subtitle: string }[] = [];

    // Run searches in parallel
    const [contactsResult, companiesResult, dealsResult] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, first_name, last_name, email, title")
        .eq("team_id", context.teamId)
        .eq("is_deleted", false)
        .or(`first_name.ilike.%${sq}%,last_name.ilike.%${sq}%,email.ilike.%${sq}%`)
        .limit(limit),
      supabase
        .from("companies")
        .select("id, name, industry, domain")
        .eq("team_id", context.teamId)
        .eq("is_deleted", false)
        .or(`name.ilike.%${sq}%,domain.ilike.%${sq}%,industry.ilike.%${sq}%`)
        .limit(limit),
      supabase
        .from("deals")
        .select("id, title, value, status")
        .eq("team_id", context.teamId)
        .eq("is_deleted", false)
        .ilike("title", `%${sq}%`)
        .limit(limit),
    ]);

    const contacts = contactsResult.data;
    const companies = companiesResult.data;
    const deals = dealsResult.data;

    contacts?.forEach((c) =>
      results.push({
        type: "contact",
        id: c.id,
        title: `${c.first_name} ${c.last_name || ""}`.trim(),
        subtitle: c.email || c.title || "",
      })
    );

    companies?.forEach((c) =>
      results.push({
        type: "company",
        id: c.id,
        title: c.name,
        subtitle: c.industry || c.domain || "",
      })
    );

    deals?.forEach((d) =>
      results.push({
        type: "deal",
        id: d.id,
        title: d.title,
        subtitle: `$${Number(d.value).toLocaleString()} - ${d.status}`,
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    logger.error("Search", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

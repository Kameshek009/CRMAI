import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";

export async function GET(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const limit = Math.min(20, parseInt(searchParams.get("limit") || "10", 10));

    if (!q || q.length < 1) {
      return NextResponse.json({ success: false, error: "Query required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const results: { type: string; id: string; title: string; subtitle: string }[] = [];

    // Search contacts
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, title")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(limit);

    contacts?.forEach((c) =>
      results.push({
        type: "contact",
        id: c.id,
        title: `${c.first_name} ${c.last_name || ""}`.trim(),
        subtitle: c.email || c.title || "",
      })
    );

    // Search companies
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, industry, domain")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .or(`name.ilike.%${q}%,domain.ilike.%${q}%,industry.ilike.%${q}%`)
      .limit(limit);

    companies?.forEach((c) =>
      results.push({
        type: "company",
        id: c.id,
        title: c.name,
        subtitle: c.industry || c.domain || "",
      })
    );

    // Search deals
    const { data: deals } = await supabase
      .from("deals")
      .select("id, title, value, status")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .ilike("title", `%${q}%`)
      .limit(limit);

    deals?.forEach((d) =>
      results.push({
        type: "deal",
        id: d.id,
        title: d.title,
        subtitle: `$${Number(d.value).toLocaleString()} - ${d.status}`,
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

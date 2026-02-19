import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId, sanitizeLike } from "@/lib/crm/helpers";

export async function GET(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const supabase = createSupabaseAdmin();

    let dbQuery = supabase
      .from("accounts")
      .select("id, name, email")
      .neq("id", accountId)
      .order("name", { ascending: true })
      .limit(limit);

    if (query.trim()) {
      const sq = sanitizeLike(query.trim());
      dbQuery = dbQuery.or(`name.ilike.%${sq}%,email.ilike.%${sq}%`);
    }

    const { data: accounts, error: dbError } = await dbQuery;

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: accounts || [] });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

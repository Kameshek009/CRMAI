import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId, parsePagination } from "@/lib/crm/helpers";
import { createCompanySchema } from "@/lib/crm/validation";

export async function GET(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const search = searchParams.get("search");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%,domain.ilike.%${search}%`);
    }

    const { data, error: dbError, count } = await query;

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("companies")
      .insert({ account_id: accountId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

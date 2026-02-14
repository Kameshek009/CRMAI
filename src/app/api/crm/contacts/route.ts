import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId, parsePagination } from "@/lib/crm/helpers";
import { createContactSchema } from "@/lib/crm/validation";

export async function GET(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const companyId = searchParams.get("company_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("contacts")
      .select("*, companies(id, name)", { count: "exact" })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (companyId) query = query.eq("company_id", companyId);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
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
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("contacts")
      .insert({ account_id: accountId, ...parsed.data })
      .select("*, companies(id, name)")
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("crm_activities").insert({
      account_id: accountId,
      contact_id: data.id,
      company_id: data.company_id,
      type: "contact_created",
      title: `Contact created: ${data.first_name} ${data.last_name || ""}`.trim(),
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

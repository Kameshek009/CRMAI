import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { updateCompanySchema } from "@/lib/crm/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    // Get contact count
    const { count: contactCount } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id)
      .eq("is_deleted", false);

    // Get deal count
    const { count: dealCount } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id)
      .eq("is_deleted", false);

    return NextResponse.json({
      success: true,
      data: { ...data, contact_count: contactCount || 0, deal_count: dealCount || 0 },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("companies")
      .update(parsed.data)
      .eq("id", id)
      .eq("account_id", accountId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("companies")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("account_id", accountId);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

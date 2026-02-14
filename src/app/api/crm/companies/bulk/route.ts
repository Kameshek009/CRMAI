import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { bulkCompaniesSchema } from "@/lib/crm/validation";

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const parsed = bulkCompaniesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { action, ids } = parsed.data;

    if (action === "delete") {
      const { error: dbError } = await supabase
        .from("companies")
        .update({ is_deleted: true })
        .in("id", ids)
        .eq("account_id", accountId);

      if (dbError) {
        return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

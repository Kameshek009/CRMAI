import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("login_history")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (dbError) {
      logger.error("LoginHistory", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch login history" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error("LoginHistory", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, teamId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const { ip_address, user_agent, city, country } = body;

    const supabase = createSupabaseAdmin();
    await supabase.from("login_history").insert({
      account_id: accountId,
      team_id: teamId,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
      city: city || null,
      country: country || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("LoginHistory", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

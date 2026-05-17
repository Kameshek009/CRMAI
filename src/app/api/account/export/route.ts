import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { collectExport } from "@/lib/gdpr/export";
import { logger } from "@/lib/logger";

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: account, error: accountErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (accountErr || !account) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }
  const accountId = account.id as string;

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentSuccesses } = await supabase
    .from("gdpr_export_log")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .gt("exported_at", since)
    .is("error", null);

  if ((recentSuccesses ?? 0) > 0) {
    return NextResponse.json(
      { success: false, error: "Export already generated in the last 24 hours" },
      { status: 429 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  let json: string;
  try {
    const payload = await collectExport(accountId);
    json = JSON.stringify(payload, null, 2);
  } catch (err) {
    logger.error("GDPR", "Export failed", err);
    await supabase.from("gdpr_export_log").insert({
      account_id: accountId,
      ip,
      file_size_bytes: 0,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }

  await supabase.from("gdpr_export_log").insert({
    account_id: accountId,
    ip,
    file_size_bytes: json.length,
    error: null,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexxus-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("accounts")
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId);

  if (error) {
    logger.error("Account", "Failed to deactivate account:", error);
    return NextResponse.json({ success: false, error: "Failed to deactivate account" }, { status: 500 });
  }

  logger.info("Account", `Account deactivated: clerk_user_id=${userId}`);
  return NextResponse.json({ success: true });
}

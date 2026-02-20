import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_KEYS = ["deal_assigned", "task_due", "new_team_member", "weekly_digest"];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createSupabaseAdmin()
    .from("accounts")
    .select("notification_preferences")
    .eq("clerk_user_id", userId)
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch preferences" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data.notification_preferences });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate keys
  const updates: Record<string, boolean> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_KEYS.includes(key) && typeof body[key] === "boolean") {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: "No valid preferences provided" }, { status: 400 });
  }

  // Fetch current preferences, merge, and save
  const supabase = createSupabaseAdmin();
  const { data: current } = await supabase
    .from("accounts")
    .select("notification_preferences")
    .eq("clerk_user_id", userId)
    .single();

  const merged = { ...(current?.notification_preferences || {}), ...updates };

  const { error } = await supabase
    .from("accounts")
    .update({ notification_preferences: merged })
    .eq("clerk_user_id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update preferences" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: merged });
}

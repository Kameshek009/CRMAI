import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sidebarConfigSchema } from "@/lib/validations/sidebar";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Get user-level config
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("sidebar_config, current_team_id")
    .eq("clerk_user_id", userId)
    .single();

  if (accountError) {
    return NextResponse.json({ success: false, error: "Failed to fetch account" }, { status: 500 });
  }

  if (account.sidebar_config) {
    return NextResponse.json({ success: true, data: { config: account.sidebar_config, source: "user" } });
  }

  // Fallback to team defaults
  if (account.current_team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", account.current_team_id)
      .single();

    if (team?.settings?.sidebar_defaults) {
      return NextResponse.json({ success: true, data: { config: team.settings.sidebar_defaults, source: "team" } });
    }
  }

  return NextResponse.json({ success: true, data: { config: null, source: "default" } });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sidebarConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid sidebar config" }, { status: 400 });
  }

  const { error } = await createSupabaseAdmin()
    .from("accounts")
    .update({ sidebar_config: parsed.data })
    .eq("clerk_user_id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to save config" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: parsed.data });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await createSupabaseAdmin()
    .from("accounts")
    .update({ sidebar_config: null })
    .eq("clerk_user_id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to reset config" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/account/profile
 * Read the current user's account row (subset). Used by the Privacy section
 * to display deletion status and last consent.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, email, deletion_requested_at, cookie_consent")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

/**
 * PATCH /api/account/profile
 * Update the current user's display name
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim().slice(0, 100);

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("accounts")
      .update({ name: trimmedName })
      .eq("clerk_user_id", userId)
      .select("id, name, email")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

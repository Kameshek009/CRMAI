import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * POST /api/auth/verify
 * Verify JWT token from desktop app and return account info
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth from Clerk (handles both session and Bearer token)
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get or create account in Supabase
    const { data: account, error } = await createSupabaseAdmin()
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    // If no account exists, create one
    if (!account) {
      const { data: newAccount, error: createError } = await createSupabaseAdmin()
        .from("accounts")
        .insert({
          clerk_user_id: userId,
          tier: "free",
          token_limit: 50000,
          tokens_used: 0,
          billing_cycle_start: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create account:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create account" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          userId,
          account: newAccount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        account,
      },
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

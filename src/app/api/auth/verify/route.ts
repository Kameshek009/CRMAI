import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

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
      logger.error("Auth","Database error:", error);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    // If no account exists, create one
    if (!account) {
      const supabaseAdmin = createSupabaseAdmin();

      // Fetch Clerk user data for name & email
      let clerkName: string | null = null;
      let clerkEmail: string | null = null;
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
        clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || null;
      } catch {
        // Continue without Clerk data
      }

      const { data: newAccount, error: createError } = await supabaseAdmin
        .from("accounts")
        .insert({
          clerk_user_id: userId,
          tier: "free",
          token_limit: 50000,
          tokens_used: 0,
          billing_cycle_start: new Date().toISOString(),
          name: clerkName,
          email: clerkEmail,
        })
        .select()
        .single();

      if (createError) {
        logger.error("Auth","Failed to create account:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create account" },
          { status: 500 }
        );
      }

      // Auto-create personal team for new accounts
      const { error: teamError } = await supabaseAdmin.rpc("create_team_with_defaults", {
        p_account_id: newAccount.id,
        p_team_name: "Personal",
      });

      if (teamError) {
        logger.error("Auth","Failed to create default team:", teamError);
      }

      // Re-fetch account with current_team_id populated
      const { data: updatedAccount } = await supabaseAdmin
        .from("accounts")
        .select("*")
        .eq("id", newAccount.id)
        .single();

      return NextResponse.json({
        success: true,
        data: {
          userId,
          account: updatedAccount || newAccount,
        },
      });
    }

    // Sync name & email from Clerk if missing
    if (!account.name || !account.email) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
        const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || null;

        const updates: Record<string, string | null> = {};
        if (!account.name && clerkName) updates.name = clerkName;
        if (!account.email && clerkEmail) updates.email = clerkEmail;

        if (Object.keys(updates).length > 0) {
          await createSupabaseAdmin()
            .from("accounts")
            .update(updates)
            .eq("id", account.id);
        }
      } catch (syncErr) {
        logger.error("Auth", "Failed to sync Clerk data:", syncErr);
      }
    }

    // Enrich with team billing data
    let enrichedAccount = account;
    if (account.current_team_id) {
      const { data: team } = await createSupabaseAdmin()
        .from("teams")
        .select("tier, token_limit, tokens_used, weekly_tokens_used, week_start_date")
        .eq("id", account.current_team_id)
        .single();
      if (team) {
        enrichedAccount = {
          ...account,
          tier: team.tier,
          token_limit: team.token_limit,
          tokens_used: team.tokens_used,
          weekly_tokens_used: team.weekly_tokens_used,
          week_start_date: team.week_start_date,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        account: enrichedAccount,
      },
    });
  } catch (error) {
    logger.error("Auth","Auth verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

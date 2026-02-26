import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@clerk/backend";
import { logger } from "@/lib/logger";

/**
 * POST /api/mobile/account
 *
 * Get or create account for mobile user.
 * Requires Clerk JWT in Authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Clerk JWT from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1] ?? "";

    // Verify token with Clerk SDK
    try {
      await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (verifyError) {
      logger.error("MobileAccount", "Token verification failed", verifyError);
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get user info from request body
    const body = await request.json();
    const { clerk_user_id, email, name } = body;

    if (!clerk_user_id) {
      return NextResponse.json(
        { error: "clerk_user_id is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Try to get existing account
    const { data: existingAccount, error: selectError } = await supabase
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", clerk_user_id)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      logger.error("MobileAccount", "Database error", selectError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (existingAccount) {
      // Update email/name if provided
      if (email || name) {
        await supabase
          .from("accounts")
          .update({
            ...(email && { email }),
            ...(name && { name })
          })
          .eq("id", existingAccount.id);
      }

      // Enrich with team billing data
      let accountWithBilling = existingAccount;
      if (existingAccount.current_team_id) {
        const { data: team } = await supabase
          .from("teams")
          .select("tier, token_limit, tokens_used, weekly_tokens_used")
          .eq("id", existingAccount.current_team_id)
          .single();
        if (team) {
          accountWithBilling = {
            ...existingAccount,
            tier: team.tier,
            token_limit: team.token_limit,
            tokens_used: team.tokens_used,
            weekly_tokens_used: team.weekly_tokens_used,
          };
        }
      }

      return NextResponse.json({
        success: true,
        account: accountWithBilling,
        created: false,
      });
    }

    // Create new account
    const { data: newAccount, error: insertError } = await supabase
      .from("accounts")
      .insert({
        clerk_user_id,
        email: email || null,
        name: name || null,
        tier: "free",
        token_limit: 1000000,
        tokens_used: 0,
        billing_cycle_start: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Handle race condition
      if (insertError.code === "23505") {
        const { data: retryAccount } = await supabase
          .from("accounts")
          .select("*")
          .eq("clerk_user_id", clerk_user_id)
          .single();

        return NextResponse.json({
          success: true,
          account: retryAccount,
          created: false,
        });
      }

      logger.error("MobileAccount", "Insert error", insertError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    logger.info("MobileAccount", "Created new account", newAccount.id);

    return NextResponse.json({
      success: true,
      account: newAccount,
      created: true,
    });
  } catch (error) {
    logger.error("MobileAccount", "Unexpected error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/account
 *
 * Get account by clerk_user_id query param.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clerk_user_id = searchParams.get("clerk_user_id");

    if (!clerk_user_id) {
      return NextResponse.json(
        { error: "clerk_user_id query param is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { data: account, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", clerk_user_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Enrich with team billing data
    let accountWithBilling = account;
    if (account.current_team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("tier, token_limit, tokens_used, weekly_tokens_used")
        .eq("id", account.current_team_id)
        .single();
      if (team) {
        accountWithBilling = {
          ...account,
          tier: team.tier,
          token_limit: team.token_limit,
          tokens_used: team.tokens_used,
          weekly_tokens_used: team.weekly_tokens_used,
        };
      }
    }

    return NextResponse.json({
      success: true,
      account: accountWithBilling,
    });
  } catch (error) {
    logger.error("MobileAccount", "GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

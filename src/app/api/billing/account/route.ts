/**
 * GET /api/billing/account
 *
 * Returns team billing and usage data.
 * Data comes from the team (not account) since billing is per-seat team-level.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculateTeamUsageStats } from "@/lib/usage/check";
import { getCustomerBillingInfo } from "@/lib/stripe/customer";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, current_team_id, clerk_user_id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get team (prefer owned team, fall back to current team)
    let teamQuery = supabase
      .from("teams")
      .select("*")
      .is("deleted_at", null);

    // Try to get the team the user owns first
    const { data: ownedTeam } = await teamQuery
      .eq("owner_account_id", account.id)
      .single();

    let team = ownedTeam;

    // If no owned team, get current team
    if (!team && account.current_team_id) {
      const { data: currentTeam } = await supabase
        .from("teams")
        .select("*")
        .eq("id", account.current_team_id)
        .is("deleted_at", null)
        .single();
      team = currentTeam;
    }

    if (!team) {
      return NextResponse.json(
        { success: false, error: "No team found" },
        { status: 404 }
      );
    }

    const isDirector = team.owner_account_id === account.id;

    // Calculate usage stats from team data
    const usageStats = calculateTeamUsageStats({
      tier: team.tier as SubscriptionTier,
      token_limit: team.token_limit,
      tokens_used: team.tokens_used,
      weekly_tokens_used: team.weekly_tokens_used,
      week_start_date: team.week_start_date,
      billing_cycle_start: team.billing_cycle_start,
      seat_count: team.seat_count,
    });

    // Get payment history
    const { data: payments } = await supabase
      .from("payment_history")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const paymentHistory = (payments || []).map((p) => ({
      id: p.id,
      accountId: p.account_id,
      teamId: p.team_id,
      stripeInvoiceId: p.stripe_invoice_id,
      stripeCheckoutSessionId: p.stripe_checkout_session_id,
      paymentType: p.payment_type,
      tierOrPackage: p.tier_or_package,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
      completedAt: p.completed_at,
    }));

    // Fetch Stripe billing info if customer exists
    let stripeBilling = null;
    if (team.stripe_customer_id) {
      stripeBilling = await getCustomerBillingInfo(team.stripe_customer_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          tier: team.tier,
          seatCount: team.seat_count,
          isDirector,
        },
        usageStats,
        paymentHistory,
        stripeBilling,
      },
    });
  } catch (error) {
    logger.error("BillingAccount", "[Billing Account] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch billing data",
      },
      { status: 500 }
    );
  }
}

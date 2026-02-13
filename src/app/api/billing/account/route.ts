/**
 * GET /api/billing/account
 *
 * Returns the current user's billing and usage data.
 * Used by the billing page to display account status.
 * Includes Stripe customer info (payment methods, invoices, subscription).
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculateUsageStats } from "@/lib/usage/check";
import { TIER_TOKEN_LIMITS } from "@/lib/constants/tiers";
import { getCustomerBillingInfo } from "@/lib/stripe/customer";
import type { Account, SubscriptionTier } from "@/types";

export async function GET() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get account from Supabase
    const supabase = createSupabaseAdmin();
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      console.error("[Billing Account] Account not found:", accountError);
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const accountData: Account = {
      id: account.id,
      clerkUserId: account.clerk_user_id,
      tier: account.tier,
      tokenLimit: account.token_limit || TIER_TOKEN_LIMITS[account.tier as SubscriptionTier] || TIER_TOKEN_LIMITS.free,
      tokensUsed: account.tokens_used || 0,
      weeklyTokensUsed: account.weekly_tokens_used || 0,
      weekStartDate: account.week_start_date || new Date().toISOString(),
      billingCycleStart: account.billing_cycle_start || new Date().toISOString(),
      tokenCredits: account.token_credits || 0,
      stripeCustomerId: account.stripe_customer_id,
      stripeSubscriptionId: account.stripe_subscription_id,
      stripePaymentMethodId: account.stripe_payment_method_id,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };

    // Calculate usage stats
    const usageStats = calculateUsageStats(accountData);

    // Get payment history
    const { data: payments } = await supabase
      .from("payment_history")
      .select("*")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Transform payment history
    const paymentHistory = (payments || []).map((p) => ({
      id: p.id,
      accountId: p.account_id,
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

    // Fetch Stripe customer billing info if customer exists
    let stripeBilling = null;
    if (account.stripe_customer_id) {
      stripeBilling = await getCustomerBillingInfo(account.stripe_customer_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        account: accountData,
        usageStats,
        paymentHistory,
        stripeBilling,
      },
    });
  } catch (error) {
    console.error("[Billing Account] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch billing data",
      },
      { status: 500 }
    );
  }
}

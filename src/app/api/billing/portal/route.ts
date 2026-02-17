/**
 * POST /api/billing/portal
 *
 * Create a Stripe billing portal session.
 * Only the team director can access the portal.
 * Uses the team's stripe_customer_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { logger } from "@/lib/logger";

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, stripe_customer_id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get the team owned by this account
    const { data: team } = await supabase
      .from("teams")
      .select("id, stripe_customer_id, owner_account_id")
      .eq("owner_account_id", account.id)
      .is("deleted_at", null)
      .single();

    if (!team) {
      return NextResponse.json(
        { success: false, error: "Only the team director can access billing portal" },
        { status: 403 }
      );
    }

    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
      return NextResponse.json(
        { success: false, error: "No email address found" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer using team's customer ID
    const customerId = await getOrCreateStripeCustomer({
      accountId: account.id,
      clerkUserId: userId,
      email: primaryEmail,
      name: user.fullName || undefined,
      teamId: team.id,
      existingStripeCustomerId: team.stripe_customer_id || account.stripe_customer_id,
    });

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account/billing`;
    const portalSession = await createPortalSession({
      customerId,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      data: { url: portalSession.url },
    });
  } catch (error) {
    logger.error("BillingPortal", "Failed to create portal session", error);
    return NextResponse.json(
      { success: false, error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}

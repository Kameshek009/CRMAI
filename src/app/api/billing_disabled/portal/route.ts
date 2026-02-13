import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";

/**
 * POST /api/billing/portal
 * Create a Stripe billing portal session.
 * Will create a Stripe customer if one doesn't exist.
 */
export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user details from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get account with Stripe customer ID
    const supabase = createSupabaseAdmin();
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

    // Get primary email from Clerk
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
      return NextResponse.json(
        { success: false, error: "No email address found" },
        { status: 400 }
      );
    }

    // Get or create permanent Stripe customer
    const customerId = await getOrCreateStripeCustomer({
      accountId: account.id,
      clerkUserId: userId,
      email: primaryEmail,
      name: user.fullName || undefined,
      existingStripeCustomerId: account.stripe_customer_id,
    });

    // Create portal session
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account/billing`;
    const portalSession = await createPortalSession({
      customerId,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: portalSession.url,
      },
    });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}

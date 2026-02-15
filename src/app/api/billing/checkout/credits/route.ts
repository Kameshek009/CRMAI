/**
 * POST /api/billing/checkout/credits
 *
 * Creates a checkout session for credit package purchases.
 * Supports both hosted (redirect to Stripe) and embedded modes.
 *
 * Request body:
 * - packageId: "credits_100k" | "credits_250k" | "credits_600k" | "credits_1500k"
 * - hosted: boolean (optional) - if true, returns URL for Stripe hosted checkout
 *
 * Returns:
 * - For hosted: url - redirect URL to Stripe checkout
 * - For embedded: clientSecret - for mounting EmbeddedCheckout
 * - sessionId: string - checkout session ID
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  createCreditsCheckout,
  CREDIT_PRICES,
  CREDIT_AMOUNTS,
} from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { logger } from "@/lib/logger";

const VALID_PACKAGES = ["credits_100k", "credits_250k", "credits_600k", "credits_1500k"];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    // Parse request body
    const body = await request.json();
    const { packageId, hosted = false } = body as { packageId: string; hosted?: boolean };

    // Validate package
    if (!packageId || !VALID_PACKAGES.includes(packageId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid package. Must be one of: ${VALID_PACKAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get price ID and token amount for package
    const priceId = CREDIT_PRICES[packageId as keyof typeof CREDIT_PRICES];
    const tokenAmount = CREDIT_AMOUNTS[packageId];

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: `Price ID not configured for package: ${packageId}` },
        { status: 500 }
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
      logger.error("Credits", "[Credits Checkout] Account not found:", accountError);
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

    // Get or create permanent Stripe customer BEFORE checkout
    const customerId = await getOrCreateStripeCustomer({
      accountId: account.id,
      clerkUserId: userId,
      email: primaryEmail,
      name: user.fullName || undefined,
      existingStripeCustomerId: account.stripe_customer_id,
    });

    // Build return URL
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account/billing/return`;

    // Create checkout session (hosted or embedded)
    const session = await createCreditsCheckout({
      customerId,
      priceId,
      packageId,
      tokenAmount,
      accountId: account.id,
      clerkUserId: userId,
      returnUrl,
      hosted,
    });

    logger.info("Credits", 
      `[Credits Checkout] Created ${hosted ? 'hosted' : 'embedded'} session: ${session.id} for package: ${packageId} (${tokenAmount.toLocaleString()} tokens)`
    );

    // Return appropriate data based on checkout mode
    if (hosted) {
      return NextResponse.json({
        success: true,
        data: {
          url: session.url,
          sessionId: session.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: session.client_secret,
        sessionId: session.id,
      },
    });
  } catch (error) {
    logger.error("Credits", "[Credits Checkout] Error creating session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}

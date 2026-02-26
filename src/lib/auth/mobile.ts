/**
 * Mobile Authentication Utilities
 *
 * Validates Clerk JWT tokens from mobile app Authorization headers.
 */

import { NextRequest } from "next/server";
import { verifyToken } from "@clerk/backend";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface MobileAuthResult {
  success: true;
  userId: string;
  accountId: string;
}

export interface MobileAuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Verify mobile authorization and get account
 */
export async function verifyMobileAuth(
  request: NextRequest
): Promise<MobileAuthResult | MobileAuthError> {
  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing authorization header",
      status: 401,
    };
  }

  const token = authHeader.split(" ")[1] ?? "";

  // Verify Clerk JWT
  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    clerkUserId = verified.sub;
  } catch (verifyError) {
    logger.error('MobileAuth', 'Token verification failed:', verifyError);
    return {
      success: false,
      error: "Invalid token",
      status: 401,
    };
  }

  // Get account by Clerk user ID
  const supabase = createSupabaseAdmin();
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (accountError || !account) {
    return {
      success: false,
      error: "Account not found",
      status: 404,
    };
  }

  return {
    success: true,
    userId: clerkUserId,
    accountId: account.id,
  };
}

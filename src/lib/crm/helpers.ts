import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Get the account ID for the currently authenticated user.
 * Returns { accountId, error } — if error is set, return it as a NextResponse.
 */
export async function getAccountId(): Promise<
  | { accountId: string; teamId: string | null; error: null }
  | { accountId: null; teamId: null; error: NextResponse }
> {
  const { userId } = await auth();

  if (!userId) {
    return {
      accountId: null,
      teamId: null,
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const supabase = createSupabaseAdmin();
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, current_team_id")
    .eq("clerk_user_id", userId)
    .single();

  if (accountError || !account) {
    return {
      accountId: null,
      teamId: null,
      error: NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      ),
    };
  }

  return { accountId: account.id, teamId: account.current_team_id, error: null };
}

/**
 * Validate that a string is a properly formatted UUID v4
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Get initials from first and last name
 */
export function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return first + last;
}

/**
 * Format a deal value as currency
 */
export function formatDealValue(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Get display name from contact
 */
export function getContactDisplayName(firstName: string, lastName?: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

/**
 * Escape special LIKE/ILIKE characters to prevent wildcard injection
 */
export function sanitizeLike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/**
 * Parse pagination params from URL search params
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.min(10000, Math.max(1, parseInt(searchParams.get("page") || "1", 10)));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Ensure deal stages exist for an account, seeding defaults if needed
 */
export async function ensureDealStages(accountId: string, teamId?: string | null) {
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("deal_stages")
    .select("id")
    .eq("account_id", accountId)
    .limit(1);

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data: stages } = await query;

  if (!stages || stages.length === 0) {
    await supabase.rpc("seed_default_deal_stages", { p_account_id: accountId });
    // Update newly seeded stages with team_id
    if (teamId) {
      await supabase
        .from("deal_stages")
        .update({ team_id: teamId })
        .eq("account_id", accountId)
        .is("team_id", null);
    }
  }
}

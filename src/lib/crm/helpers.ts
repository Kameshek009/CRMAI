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
 * Ensure deal stages exist for an account+team, seeding defaults if needed
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

  if (stages && stages.length > 0) return;

  // Try seeding via RPC
  await supabase.rpc("seed_default_deal_stages", { p_account_id: accountId });

  if (teamId) {
    // Assign any unassigned stages to this team
    await supabase
      .from("deal_stages")
      .update({ team_id: teamId })
      .eq("account_id", accountId)
      .is("team_id", null);

    // If still no stages (RPC skipped because stages exist for other teams), create defaults manually
    const { data: checkAgain } = await supabase
      .from("deal_stages")
      .select("id")
      .eq("account_id", accountId)
      .eq("team_id", teamId)
      .limit(1);

    if (!checkAgain || checkAgain.length === 0) {
      // Find max position to avoid unique constraint on (account_id, position)
      const { data: maxPos } = await supabase
        .from("deal_stages")
        .select("position")
        .eq("account_id", accountId)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const startPos = (maxPos?.position ?? -1) + 1;

      const defaultStages = [
        { name: "Lead", color: "#94a3b8", is_won: false, is_lost: false },
        { name: "Qualified", color: "#6366f1", is_won: false, is_lost: false },
        { name: "Proposal", color: "#f59e0b", is_won: false, is_lost: false },
        { name: "Negotiation", color: "#f97316", is_won: false, is_lost: false },
        { name: "Success", color: "#22c55e", is_won: true, is_lost: false },
        { name: "Closed", color: "#ef4444", is_won: false, is_lost: true },
      ];

      await supabase.from("deal_stages").insert(
        defaultStages.map((s, i) => ({
          account_id: accountId,
          team_id: teamId,
          position: startPos + i,
          ...s,
        }))
      );
    }
  }
}

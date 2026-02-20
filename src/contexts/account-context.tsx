"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase/client";
import type { SubscriptionTier } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Account data structure matching Supabase schema
 */
export interface AccountData {
  id: string;
  clerkUserId: string;
  tier: SubscriptionTier;
  tokenLimit: number;
  tokensUsed: number;
  weeklyTokensUsed: number;
  weekStartDate: Date;
  tokenCredits: number;
  billingCycleStart: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/**
 * Computed usage statistics
 */
export interface UsageStats {
  tokensUsed: number;
  tokenLimit: number;
  percentUsed: number;
  tokensRemaining: number;
  weeklyTokensUsed: number;
  weeklyTokenLimit: number;
  weeklyPercentUsed: number;
  daysRemaining: number;
  daysIntoWeek: number;
  billingCycleEnd: Date;
  isWeeklyCapExceeded: boolean;
  isMonthlyCapExceeded: boolean;
}

/**
 * Context value interface
 */
interface AccountContextValue {
  account: AccountData | null;
  usage: UsageStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

/**
 * Calculate usage statistics from account data
 */
function calculateUsageStats(account: AccountData): UsageStats {
  const tokensUsed = account.tokensUsed;
  const tokenLimit = account.tokenLimit;
  const tokensRemaining = Math.max(0, tokenLimit - tokensUsed);
  const percentUsed = tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0;

  // Weekly limits (monthly / 4)
  const weeklyTokenLimit = Math.floor(tokenLimit / 4);
  const weeklyTokensUsed = account.weeklyTokensUsed;
  const weeklyPercentUsed = weeklyTokenLimit > 0 ? (weeklyTokensUsed / weeklyTokenLimit) * 100 : 0;

  // Calculate billing cycle end (1 month from start)
  const billingCycleEnd = new Date(account.billingCycleStart);
  billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

  // Calculate days remaining in billing cycle
  const now = new Date();
  const msRemaining = billingCycleEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  // Calculate days into current week
  const weekStartDate = new Date(account.weekStartDate);
  const daysIntoWeek = Math.min(7, Math.floor((now.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Check if caps are exceeded
  const isWeeklyCapExceeded = weeklyTokensUsed >= weeklyTokenLimit && weeklyTokenLimit > 0;
  const isMonthlyCapExceeded = tokensUsed >= tokenLimit && tokenLimit > 0;

  return {
    tokensUsed,
    tokenLimit,
    percentUsed,
    tokensRemaining,
    weeklyTokensUsed,
    weeklyTokenLimit,
    weeklyPercentUsed,
    daysRemaining,
    daysIntoWeek,
    billingCycleEnd,
    isWeeklyCapExceeded,
    isMonthlyCapExceeded,
  };
}

/**
 * Transform database row to AccountData
 */
function transformAccount(row: {
  id: string;
  clerk_user_id: string;
  tier: SubscriptionTier;
  token_limit: number;
  tokens_used: number;
  weekly_tokens_used?: number;
  week_start_date?: string;
  token_credits?: number;
  billing_cycle_start: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}): AccountData {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    tier: row.tier,
    tokenLimit: row.token_limit,
    tokensUsed: row.tokens_used,
    weeklyTokensUsed: row.weekly_tokens_used || 0,
    weekStartDate: row.week_start_date ? new Date(row.week_start_date) : new Date(),
    tokenCredits: row.token_credits || 0,
    billingCycleStart: new Date(row.billing_cycle_start),
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

interface AccountProviderProps {
  children: ReactNode;
}

/**
 * AccountProvider - Provides real-time account data throughout the dashboard
 *
 * Features:
 * - Fetches account data on mount
 * - Subscribes to Supabase Realtime for live updates
 * - Auto-reconnects on connection loss
 * - Provides computed usage statistics
 */
export function AccountProvider({ children }: AccountProviderProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const teamIdRef = useRef<string | null>(null);

  /**
   * Fetch account data from API
   *
   * Uses /api/auth/verify which:
   * 1. Creates account if it doesn't exist (auto-provision)
   * 2. Returns full account data including usage stats
   *
   * This ensures new users get accounts created on first visit.
   */
  const fetchAccount = useCallback(async () => {
    if (!user?.id) {
      setAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Call /api/auth/verify first - this creates the account if it doesn't exist
      // and returns the full account data including tokens_used, token_limit, etc.
      const response = await fetch("/api/auth/verify", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch account data (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch account data");
      }

      if (result.data?.account) {
        const transformedAccount = transformAccount(result.data.account);
        setAccount(transformedAccount);
        accountIdRef.current = transformedAccount.id;
        // Store current_team_id for Realtime subscription
        teamIdRef.current = result.data.account.current_team_id || null;
      } else {
        throw new Error("No account data in response");
      }
    } catch (err) {
      console.error("[AccountContext] Error loading account:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Subscribe to Supabase Realtime updates on the team table
   * (billing data lives on teams after per-seat migration)
   */
  const subscribeToRealtime = useCallback(() => {
    if (!accountIdRef.current || !account) {
      return;
    }

    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // We need the current_team_id to subscribe to team changes.
    // The account-context fetches from /api/auth/verify which returns
    // the account enriched with team billing. We rely on the raw API
    // response storing current_team_id in a ref set during fetchAccount.
    const teamId = teamIdRef.current;
    if (!teamId) return;

    const channel = supabase
      .channel(`account-team:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teams",
          filter: `id=eq.${teamId}`,
        },
        (payload: { new: Record<string, unknown> | null }) => {
          if (payload.new && account) {
            // Merge team billing updates into account data
            const teamData = payload.new as {
              tier?: SubscriptionTier;
              token_limit?: number;
              tokens_used?: number;
              weekly_tokens_used?: number;
              week_start_date?: string;
            };
            setAccount((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                tier: (teamData.tier as SubscriptionTier) || prev.tier,
                tokenLimit: teamData.token_limit ?? prev.tokenLimit,
                tokensUsed: teamData.tokens_used ?? prev.tokensUsed,
                weeklyTokensUsed: teamData.weekly_tokens_used ?? prev.weeklyTokensUsed,
                weekStartDate: teamData.week_start_date ? new Date(teamData.week_start_date) : prev.weekStartDate,
              };
            });
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        setIsConnected(status === "SUBSCRIBED");
        if (err) {
          console.error("[AccountContext] Realtime subscription error:", err.message);
        }
      });

    channelRef.current = channel;
  }, [account]);

  /**
   * Refetch account data manually
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchAccount();
  }, [fetchAccount]);

  // Initial fetch when user is loaded
  useEffect(() => {
    if (isUserLoaded) {
      fetchAccount();
    }
  }, [isUserLoaded, fetchAccount]);

  // Set up realtime subscription after account is fetched
  useEffect(() => {
    if (account?.id) {
      subscribeToRealtime();
    }

    return () => {
      if (channelRef.current) {
        // Cleanup realtime subscription
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [account?.id, subscribeToRealtime]);

  // Calculate usage stats only on the client (uses new Date() which differs server/client)
  const [usage, setUsage] = useState<UsageStats | null>(null);
  useEffect(() => {
    if (account) {
      setUsage(calculateUsageStats(account));
    } else {
      setUsage(null);
    }
  }, [account]);

  const value: AccountContextValue = useMemo(
    () => ({ account, usage, isLoading, error, refetch, isConnected }),
    [account, usage, isLoading, error, refetch, isConnected]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

/**
 * Hook to access account context
 */
export function useAccount() {
  const context = useContext(AccountContext);

  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }

  return context;
}

/**
 * Hook to get just the usage statistics
 */
export function useUsage() {
  const { usage, isLoading, error, refetch } = useAccount();
  return { usage, isLoading, error, refetch };
}

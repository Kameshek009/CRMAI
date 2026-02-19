import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { TIER_FEATURE_LIMITS, type SubscriptionTier, type FeatureLimitKey } from "@/types";

// Maps FeatureLimitKey → { table, countFilter }
const ENTITY_COUNT_CONFIG: Record<
  FeatureLimitKey,
  { table: string; filters?: Record<string, unknown> }
> = {
  contacts: { table: "contacts", filters: { is_deleted: false } },
  companies: { table: "companies", filters: { is_deleted: false } },
  deals: { table: "deals", filters: { is_deleted: false } },
  leads: { table: "leads", filters: { is_deleted: false } },
  tasks: { table: "crm_tasks", filters: { is_deleted: false } },
  customFields: { table: "field_definitions" },
  activeAutomations: { table: "automations", filters: { is_active: true } },
  pipelineStages: { table: "deal_stages" },
  emailTemplates: { table: "email_templates" },
  emailSequences: { table: "email_sequences" },
  visibilityGroups: { table: "visibility_groups" },
  teamMembers: { table: "team_members", filters: { status: "active" } },
};

export interface FeatureLimitResult {
  allowed: boolean;
  current: number;
  limit: number; // 0 = unlimited
}

/**
 * Check if a team can create one more entity of the given type.
 * Returns { allowed, current, limit }.
 */
export async function checkFeatureLimit(
  teamId: string,
  tier: SubscriptionTier,
  feature: FeatureLimitKey
): Promise<FeatureLimitResult> {
  const limit = TIER_FEATURE_LIMITS[tier][feature];

  // 0 = unlimited
  if (limit === 0) {
    return { allowed: true, current: 0, limit: 0 };
  }

  const config = ENTITY_COUNT_CONFIG[feature];
  if (!config) {
    return { allowed: true, current: 0, limit: 0 };
  }

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from(config.table)
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (config.filters) {
    for (const [key, value] of Object.entries(config.filters)) {
      query = query.eq(key, value);
    }
  }

  const { count } = await query;
  const current = count ?? 0;

  // Grace period: allow up to 110% of nominal limit before hard block
  const graceLimit = Math.ceil(limit * 1.1);

  return {
    allowed: current < graceLimit,
    current,
    limit,
  };
}

/**
 * Returns a 403 response if the feature limit is exceeded, null if allowed.
 * Drop-in after requirePermission() in API POST handlers.
 */
export async function requireFeatureLimit(
  teamId: string,
  tier: SubscriptionTier,
  feature: FeatureLimitKey
): Promise<NextResponse | null> {
  const result = await checkFeatureLimit(teamId, tier, feature);

  if (!result.allowed) {
    const limitLabel = FEATURE_LABELS[feature] || feature;
    return NextResponse.json(
      {
        success: false,
        error: `Limit reached: ${limitLabel} (${result.current}/${result.limit}). Upgrade your plan for more.`,
        code: "FEATURE_LIMIT_EXCEEDED",
        feature,
        current: result.current,
        limit: result.limit,
      },
      { status: 403 }
    );
  }

  return null;
}

const FEATURE_LABELS: Record<FeatureLimitKey, string> = {
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  leads: "Leads",
  tasks: "Tasks",
  customFields: "Custom Fields",
  activeAutomations: "Active Automations",
  pipelineStages: "Pipeline Stages",
  emailTemplates: "Email Templates",
  emailSequences: "Email Sequences",
  visibilityGroups: "Visibility Groups",
  teamMembers: "Team Members",
};

/**
 * Get current usage counts for all features (for the usage-counts API).
 */
export async function getAllUsageCounts(
  teamId: string,
  tier: SubscriptionTier
): Promise<Record<FeatureLimitKey, { current: number; limit: number }>> {
  const supabase = createSupabaseAdmin();
  const features = Object.keys(ENTITY_COUNT_CONFIG) as FeatureLimitKey[];

  const counts = await Promise.all(
    features.map(async (feature) => {
      const config = ENTITY_COUNT_CONFIG[feature];
      let query = supabase
        .from(config.table)
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId);

      if (config.filters) {
        for (const [key, value] of Object.entries(config.filters)) {
          query = query.eq(key, value);
        }
      }

      const { count } = await query;
      return { feature, current: count ?? 0 };
    })
  );

  const result = {} as Record<FeatureLimitKey, { current: number; limit: number }>;
  for (const { feature, current } of counts) {
    result[feature] = {
      current,
      limit: TIER_FEATURE_LIMITS[tier][feature],
    };
  }

  return result;
}

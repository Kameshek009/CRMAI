import { sanitizeLike } from "./helpers";

// ============================================================================
// Types
// ============================================================================

export interface ListQueryParams {
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
  filters?: Record<string, string | string[]>;
}

export interface VisibilityContext {
  accountId: string;
  isOwner: boolean;
  fixedRole: string;
  visibilityGroupIds?: string[];
}

// Allowed sort fields per entity to prevent injection
const ALLOWED_SORT_FIELDS: Record<string, string[]> = {
  contacts: ["created_at", "first_name", "last_name", "email", "status", "engagement_score"],
  companies: ["created_at", "name", "industry", "size", "ai_health_score"],
  deals: ["created_at", "title", "value", "status", "expected_close_date", "ai_win_probability"],
  tasks: ["created_at", "title", "due_date", "priority", "status", "type"],
  call_logs: ["created_at", "direction", "status", "duration_seconds"],
  notes: ["created_at", "updated_at", "is_pinned"],
  leads: ["created_at", "first_name", "last_name", "email", "status", "source", "organization"],
  showings: ["created_at", "title", "showing_date", "status", "address"],
};

// Allowed filter fields per entity
const ALLOWED_FILTER_FIELDS: Record<string, string[]> = {
  contacts: ["status", "source", "company_id"],
  companies: ["industry", "size"],
  deals: ["status", "stage_id"],
  tasks: ["status", "priority", "type"],
  call_logs: ["status", "direction"],
  notes: ["is_pinned"],
  leads: ["status", "source", "lead_owner_account_id"],
  showings: ["status", "contact_id", "deal_id"],
};

// ============================================================================
// Query Parser
// ============================================================================

export function parseListParams(url: URL): ListQueryParams {
  const params: ListQueryParams = {};

  const search = url.searchParams.get("search") || url.searchParams.get("q");
  if (search) params.search = search;

  const sortBy = url.searchParams.get("sort_by");
  if (sortBy) params.sort_by = sortBy;

  const sortOrder = url.searchParams.get("sort_order");
  if (sortOrder === "asc" || sortOrder === "desc") params.sort_order = sortOrder;

  const page = url.searchParams.get("page");
  if (page) params.page = Math.max(1, parseInt(page, 10) || 1);

  const limit = url.searchParams.get("limit");
  if (limit) params.limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  // Parse filter_* params
  const filters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith("filter_")) {
      const field = key.slice(7); // remove "filter_"
      filters[field] = value;
    }
  });
  if (Object.keys(filters).length > 0) params.filters = filters;

  return params;
}

// ============================================================================
// Query Builder
// ============================================================================

/** Minimal interface for a chainable Supabase query (no generated DB types). */
interface ChainableQuery {
  eq(column: string, value: unknown): ChainableQuery;
  or(conditions: string): ChainableQuery;
  order(column: string, options: { ascending: boolean }): ChainableQuery;
  range(from: number, to: number): ChainableQuery;
}

export function applyListQuery<Q extends ChainableQuery>(
  query: Q,
  entityType: string,
  params: ListQueryParams,
  searchFields?: string[]
): Q {
  const allowedSorts = ALLOWED_SORT_FIELDS[entityType] || [];
  const allowedFilters = ALLOWED_FILTER_FIELDS[entityType] || [];

  // Apply filters
  if (params.filters) {
    for (const [field, value] of Object.entries(params.filters)) {
      if (allowedFilters.includes(field) && value) {
        query = query.eq(field, value) as Q;
      }
    }
  }

  // Apply search across fields
  if (params.search && searchFields && searchFields.length > 0) {
    const sanitized = sanitizeLike(params.search);
    const orConditions = searchFields
      .map((field) => `${field}.ilike.%${sanitized}%`)
      .join(",");
    query = query.or(orConditions) as Q;
  }

  // Apply sort
  const sortBy = params.sort_by && allowedSorts.includes(params.sort_by)
    ? params.sort_by
    : "created_at";
  const sortOrder = params.sort_order || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as Q;

  // Apply pagination
  const page = params.page || 1;
  const limit = params.limit || 50;
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1) as Q;

  return query;
}
/**
 * Apply visibility filter to a query.
 * - Owner/Admin: see everything in the workspace
 * - Member: see 'workspace' records + own records + assigned records
 * - Viewer: see only 'workspace' records
 *
 * Entity must have: visibility, account_id columns.
 * Optional: assigned_to column.
 */
export function applyVisibilityFilter<Q extends ChainableQuery>(
  query: Q,
  entityType: string,
  ctx: VisibilityContext
): Q {
  // Owners and admins see everything
  if (ctx.isOwner || ctx.fixedRole === "owner" || ctx.fixedRole === "admin") {
    return query;
  }

  // Viewers: only workspace-visible records
  if (ctx.fixedRole === "viewer") {
    return query.eq("visibility", "workspace") as Q;
  }

  // Members: workspace records + own + assigned + group records
  const hasAssignedTo = ["contacts", "deals"].includes(entityType);
  const hasVisGroup = ["contacts", "companies", "deals"].includes(entityType);

  const conditions = [
    `visibility.eq.workspace`,
    `account_id.eq.${ctx.accountId}`,
  ];

  if (hasAssignedTo) {
    conditions.push(`assigned_to.eq.${ctx.accountId}`);
  }

  // Include records assigned to any of user's visibility groups
  if (hasVisGroup && ctx.visibilityGroupIds && ctx.visibilityGroupIds.length > 0) {
    conditions.push(
      `visibility_group_id.in.(${ctx.visibilityGroupIds.join(",")})`
    );
  }

  return query.or(conditions.join(",")) as Q;
}

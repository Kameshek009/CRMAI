/**
 * withApiHandler — reusable wrapper that eliminates boilerplate across API routes.
 *
 * Handles the repetitive pattern found in 140+ routes:
 *   1. getWorkspaceContext()
 *   2. requirePermission()
 *   3. Zod body/query validation
 *   4. Execute handler
 *   5. Catch errors and return standardised error responses
 *
 * BACKWARDS COMPATIBLE: existing routes continue working without changes.
 * This wrapper is for new routes or gradual migration of existing ones.
 *
 * ─── USAGE EXAMPLES ───────────────────────────────────────────────────────────
 *
 * // Example 1: Simple list endpoint (GET /api/crm/contacts)
 *
 *   import { withApiHandler } from "@/lib/crm/with-api-handler";
 *
 *   export const GET = withApiHandler(
 *     {
 *       permission: { resource: "contacts", action: "read" },
 *     },
 *     async (request, ctx) => {
 *       const supabase = createSupabaseAdmin();
 *       const { data, error, count } = await supabase
 *         .from("contacts")
 *         .select("*", { count: "exact" })
 *         .eq("team_id", ctx.workspaceId)
 *         .eq("is_deleted", false);
 *
 *       if (error) throw new ApiError("Failed to fetch contacts", 500);
 *
 *       return NextResponse.json({ success: true, data, total: count });
 *     }
 *   );
 *
 * // Example 2: Create endpoint with body validation (POST /api/crm/contacts)
 *
 *   import { createContactSchema } from "@/lib/crm/validation";
 *
 *   export const POST = withApiHandler(
 *     {
 *       permission: { resource: "contacts", action: "create" },
 *       bodySchema: createContactSchema,
 *     },
 *     async (_request, ctx, { body }) => {
 *       const supabase = createSupabaseAdmin();
 *       const { data, error } = await supabase
 *         .from("contacts")
 *         .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
 *         .select()
 *         .single();
 *
 *       if (error) throw new ApiError("Failed to create contact", 500);
 *
 *       return NextResponse.json({ success: true, data });
 *     }
 *   );
 *
 * // Example 3: Dynamic route with params (GET /api/crm/contacts/[id])
 *
 *   export const GET = withApiHandler(
 *     {
 *       permission: { resource: "contacts", action: "read" },
 *     },
 *     async (_request, ctx, { routeParams }) => {
 *       const { id } = routeParams;
 *       // ...
 *       return NextResponse.json({ success: true, data });
 *     }
 *   );
 *
 * // Example 4: Query params validation (GET with filters)
 *
 *   const listQuerySchema = z.object({
 *     status: z.enum(["active", "archived"]).optional(),
 *     page: z.coerce.number().int().positive().optional(),
 *   });
 *
 *   export const GET = withApiHandler(
 *     {
 *       permission: { resource: "deals", action: "read" },
 *       querySchema: listQuerySchema,
 *     },
 *     async (request, ctx, { query }) => {
 *       // query is typed as { status?: "active" | "archived"; page?: number }
 *       return NextResponse.json({ success: true, data: [] });
 *     }
 *   );
 *
 * // Example 5: No permission check (public-ish workspace endpoint)
 *
 *   export const GET = withApiHandler(
 *     {},
 *     async (_request, ctx) => {
 *       // ctx is still available (authenticated user, workspace resolved)
 *       return NextResponse.json({ success: true, data: { tier: ctx.tier } });
 *     }
 *   );
 *
 * // Example 6: Using ApiError for controlled error responses
 *
 *   export const PATCH = withApiHandler(
 *     {
 *       permission: { resource: "contacts", action: "update" },
 *       bodySchema: updateContactSchema,
 *     },
 *     async (_request, ctx, { body, routeParams }) => {
 *       const supabase = createSupabaseAdmin();
 *       const { data, error } = await supabase
 *         .from("contacts")
 *         .update(body)
 *         .eq("id", routeParams.id)
 *         .eq("team_id", ctx.workspaceId)
 *         .select()
 *         .single();
 *
 *       if (error || !data) {
 *         throw new ApiError("Contact not found", 404);
 *       }
 *
 *       return NextResponse.json({ success: true, data });
 *     }
 *   );
 *
 * ─── END OF EXAMPLES ──────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext, requirePermission } from "@/lib/crm/team-helpers";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import type { WorkspaceContext, WorkspacePermissions } from "@/types/team";
import type { FeatureLimitKey } from "@/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyBearerToken } from "@/lib/api-auth/bearer-token";
import { buildApiKeyContext } from "@/lib/api-auth/api-key-context";
import { z } from "zod";

function looksLikeBearer(request: NextRequest): boolean {
  const h = request.headers.get("Authorization");
  return Boolean(h?.startsWith("Bearer nxk_live_"));
}

// ---------------------------------------------------------------------------
// ApiError — throw this inside handlers for controlled error responses
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiHandlerOptions<
  TBodySchema extends z.ZodSchema = z.ZodSchema,
  TQuerySchema extends z.ZodSchema = z.ZodSchema,
> {
  /**
   * Permission check — skipped if omitted (handler still receives authenticated context).
   * Uses `context.isOwner` as the bypass flag, matching the existing requirePermission call.
   */
  permission?: {
    resource: keyof WorkspacePermissions;
    action: string;
  };

  /** Zod schema for JSON request body validation (typically for POST / PATCH / PUT). */
  bodySchema?: TBodySchema;

  /** Zod schema for URL search-params validation (for GET filters, pagination, etc.). */
  querySchema?: TQuerySchema;

  /**
   * Feature limit check — runs after permission check (for POST / create endpoints).
   * Pass the FeatureLimitKey (e.g. "contacts", "deals").
   */
  featureLimit?: FeatureLimitKey;

  /**
   * Tag used in logger.error calls (e.g. "Contacts", "Deals").
   * Defaults to "API" if not provided.
   */
  logTag?: string;

  /**
   * Rate limiting — applied before auth. If omitted, no rate limit is enforced.
   * Example: `{ limit: 20, windowMs: 60_000, keyPrefix: "ai-chat" }`
   */
  rateLimit?: { limit: number; windowMs?: number; keyPrefix?: string };

  /**
   * Maximum allowed request body size in bytes (default: 1MB).
   * Prevents DoS via oversized payloads. Set to 0 to disable.
   */
  maxBodySize?: number;

  /**
   * Scopes required when the request is authenticated via API key
   * (Authorization: Bearer nxk_live_*). Setting this opts the route in
   * to public API access; absence means bearer requests are rejected with
   * a Clerk-redirect from middleware, as before. Clerk-session requests
   * continue to use the `permission` check above.
   *
   * Example: `bearerScopes: ["contacts:read"]`
   */
  bearerScopes?: readonly string[];
}

/**
 * The handler function that route authors implement.
 *
 * @param request  - The raw NextRequest (still available for headers, cookies, etc.)
 * @param context  - The authenticated WorkspaceContext (accountId, workspaceId, tier, ...)
 * @param params   - Pre-parsed & validated inputs:
 *                     body       — parsed JSON body (typed via bodySchema)
 *                     query      — parsed search params (typed via querySchema)
 *                     routeParams — Next.js dynamic segments (e.g. { id: "..." })
 */
export type ApiHandlerFn<TBody = unknown, TQuery = unknown> = (
  request: NextRequest,
  context: WorkspaceContext,
  params: {
    body: TBody;
    query: TQuery;
    routeParams: Record<string, string>;
  },
) => Promise<NextResponse>;

/**
 * The shape of the second argument Next.js passes to route handlers for dynamic segments.
 * In Next.js 15 App Router, `params` is a Promise.
 */
interface NextRouteContext {
  params?: Promise<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// withApiHandler
// ---------------------------------------------------------------------------

/**
 * Creates a Next.js App Router route handler with built-in:
 *   - Authentication (getWorkspaceContext)
 *   - Permission checking (requirePermission)
 *   - Request body validation (Zod)
 *   - Search params validation (Zod)
 *   - Dynamic route params resolution
 *   - Standardised error handling
 *
 * The returned function has the exact signature Next.js expects:
 *   (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
 *
 * so it can be directly exported as GET / POST / PATCH / PUT / DELETE.
 */
export function withApiHandler<
  TBodySchema extends z.ZodSchema = z.ZodSchema<unknown>,
  TQuerySchema extends z.ZodSchema = z.ZodSchema<unknown>,
>(
  options: ApiHandlerOptions<TBodySchema, TQuerySchema>,
  handler: ApiHandlerFn<z.infer<TBodySchema>, z.infer<TQuerySchema>>,
) {
  const tag = options.logTag ?? "API";

  return async function routeHandler(
    request: NextRequest,
    nextContext?: NextRouteContext,
  ): Promise<NextResponse> {
    try {
      // ── 0a. Rate limiting (optional) ─────────────────────────────────
      if (options.rateLimit) {
        const rateLimitResponse = await checkRateLimit(request, options.rateLimit);
        if (rateLimitResponse) return rateLimitResponse;
      }

      // ── 0b. Body size check ────────────────────────────────────────────
      const maxBodySize = options.maxBodySize ?? 1_048_576; // 1MB default
      if (maxBodySize > 0) {
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
          return NextResponse.json(
            { success: false, error: "Request body too large" },
            { status: 413 },
          );
        }
      }

      // ── 0c. Auth mode detection ───────────────────────────────────────
      const useBearer = looksLikeBearer(request);

      // ── 0d. CSRF protection for mutating methods ───────────────────────
      // Skipped for bearer-authed requests — they are not browser-cookie
      // auth, so the same-origin invariant does not apply.
      const method = request.method.toUpperCase();
      if (!useBearer && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
        const origin = request.headers.get("origin");
        if (origin) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (!appUrl) {
            logger.error(tag, "NEXT_PUBLIC_APP_URL is not set — CSRF check cannot proceed");
            return NextResponse.json(
              { success: false, error: "Server configuration error" },
              { status: 500 },
            );
          }
          if (new URL(origin).origin !== new URL(appUrl).origin) {
            return NextResponse.json(
              { success: false, error: "Cross-origin request denied" },
              { status: 403 },
            );
          }
        }
      }

      // ── 1. Authentication & workspace resolution ──────────────────────
      let context: WorkspaceContext;
      if (useBearer) {
        if (!options.bearerScopes) {
          return NextResponse.json(
            { success: false, error: "API key authentication is not enabled for this endpoint" },
            { status: 401 },
          );
        }
        const auth = await verifyBearerToken(request, { requireScopes: options.bearerScopes });
        if (!auth.ok) {
          const status = auth.reason === "insufficient_scope" ? 403 : 401;
          return NextResponse.json(
            { success: false, error: `API key: ${auth.reason}`, missing: "missing" in auth ? auth.missing : undefined },
            { status },
          );
        }
        context = await buildApiKeyContext(auth);
      } else {
        const { context: clerkCtx, error: ctxError } = await getWorkspaceContext();
        if (ctxError) return ctxError;
        context = clerkCtx;

        // ── 2. Permission check (Clerk path only) ───────────────────────
        if (options.permission) {
          const permError = requirePermission(
            context.permissions,
            options.permission.resource,
            options.permission.action,
            context.isOwner,
          );
          if (permError) return permError;
        }
      }

      // ── 3. Feature limit check (optional) ────────────────────────────
      if (options.featureLimit) {
        const limitError = await requireFeatureLimit(
          context.workspaceId,
          context.tier,
          options.featureLimit,
        );
        if (limitError) return limitError;
      }

      // ── 4. Parse request body (optional) ──────────────────────────────
      let body: z.infer<TBodySchema> = undefined as z.infer<TBodySchema>;

      if (options.bodySchema) {
        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        const parsed = options.bodySchema.safeParse(rawBody);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid input",
              details: parsed.error.issues,
            },
            { status: 400 },
          );
        }
        body = parsed.data as z.infer<TBodySchema>;
      }

      // ── 5. Parse search params (optional) ─────────────────────────────
      let query: z.infer<TQuerySchema> = undefined as z.infer<TQuerySchema>;

      if (options.querySchema) {
        const url = new URL(request.url);
        const rawQuery: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          rawQuery[key] = value;
        });

        const parsed = options.querySchema.safeParse(rawQuery);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid query parameters",
              details: parsed.error.issues,
            },
            { status: 400 },
          );
        }
        query = parsed.data as z.infer<TQuerySchema>;
      }

      // ── 6. Resolve dynamic route params ───────────────────────────────
      let routeParams: Record<string, string> = {};
      if (nextContext?.params) {
        routeParams = await nextContext.params;
      }

      // ── 7. Execute handler ────────────────────────────────────────────
      return await handler(request, context, { body, query, routeParams });

    } catch (error) {
      // ── 8. Error handling ─────────────────────────────────────────────
      if (error instanceof ApiError) {
        const responseBody: Record<string, unknown> = {
          success: false,
          error: error.message,
        };
        if (error.details !== undefined) {
          responseBody.details = error.details;
        }
        return NextResponse.json(responseBody, { status: error.statusCode });
      }

      logger.error(tag, `Unhandled error in ${request.method} ${request.url}`, error);
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

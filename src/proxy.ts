import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Canonical host enforcement: traffic landing on the legacy Vercel-default
// hostname (or any host listed in NEXXUS_REDIRECT_HOSTS) is 308'd to the
// canonical host so:
//   - SEO doesn't see duplicate content
//   - OAuth state cookies are set on the same host the callback returns to
//   - Webhooks (Pub/Sub, Meta) only need one URL registered
// Set CANONICAL_HOST env to the bare host (no scheme), e.g. `nexxuscrm.com`.
// Leave NEXXUS_REDIRECT_HOSTS empty to disable.
const CANONICAL_HOST = process.env.CANONICAL_HOST?.trim() || null;
const REDIRECT_HOSTS = (process.env.NEXXUS_REDIRECT_HOSTS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/security",
  "/docs",
  "/api/openapi.json",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/billing_disabled/webhook",
  // Resend delivery webhook — verifies its own Svix signature
  "/api/webhooks/resend",
  // Gmail inbox push — verifies its own Pub/Sub JWT
  "/api/webhooks/google/gmail",
  // Google Calendar push — verifies its own X-Goog-Channel-Token
  "/api/webhooks/google/calendar",
  // Microsoft Graph inbox push — handshake + per-subscription clientState
  "/api/webhooks/microsoft/inbox",
  // Twilio voice status + TwiML — verifies its own X-Twilio-Signature
  "/api/webhooks/twilio/(.*)",
  // Desktop app auth endpoints (use their own JWT validation)
  "/api/auth/desktop/(.*)",
  // Desktop sync endpoints (use their own JWT validation)
  "/api/desktop/(.*)",
  // Agent status endpoint (used by mobile/dashboard)
  "/api/agent/status",
  // Health check
  "/api/health",
  // Public web forms
  "/api/public/(.*)",
  "/f/(.*)",
]);

// Define API routes that need JWT validation
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

// Routes that handle their own Bearer token validation (not Clerk sessions)
const isBearerAuthRoute = createRouteMatcher([
  "/api/llm/chat",        // Desktop app — validates desktop JWT
  "/api/sync/stream",     // Desktop app — validates desktop JWT
  "/api/mobile/(.*)",     // Mobile app — validates Clerk JWT via verifyMobileAuth()
  "/api/cron/(.*)",       // Cron jobs — validates CRON_SECRET
]);

export default clerkMiddleware(async (auth, request) => {
  try {
    // Canonical host redirect — runs BEFORE rate limit / auth so we bounce
    // the user to the right host before any cookies are set.
    if (CANONICAL_HOST && REDIRECT_HOSTS.length > 0) {
      const host = request.headers.get("host")?.toLowerCase() ?? "";
      if (host && REDIRECT_HOSTS.includes(host) && host !== CANONICAL_HOST) {
        const url = new URL(request.url);
        url.host = CANONICAL_HOST;
        url.protocol = "https:";
        url.port = "";
        return NextResponse.redirect(url, 308);
      }
    }

    // Global API rate limit (120 req/min per IP)
    if (isApiRoute(request) && !isPublicRoute(request)) {
      const rateLimited = await checkRateLimit(request, { limit: 120, keyPrefix: "global" });
      if (rateLimited) return rateLimited;
    }

    // Allow public routes
    if (isPublicRoute(request)) {
      return;
    }

    // For whitelisted Bearer routes, let the route handler validate the token
    if (isBearerAuthRoute(request)) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        return;
      }
    }

    // Nexxus public API keys: any /api/* request with `Authorization: Bearer
    // nxk_live_*` is handed off to the route handler (withApiHandler) which
    // calls verifyBearerToken. Clerk session check is skipped here.
    if (isApiRoute(request)) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer nxk_live_")) {
        return;
      }
    }

    // Protect all other routes with Clerk session auth
    await auth.protect();
  } catch {
    // Prevent PROXY_INVOCATION_FAILED - redirect to sign-in on errors
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

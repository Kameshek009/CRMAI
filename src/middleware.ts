import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/security",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/billing_disabled/webhook",
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
    // Global API rate limit (120 req/min per IP)
    if (isApiRoute(request) && !isPublicRoute(request)) {
      const rateLimited = checkRateLimit(request, { limit: 120, keyPrefix: "global" });
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

    // Protect all other routes with Clerk session auth
    await auth.protect();
  } catch {
    // Prevent MIDDLEWARE_INVOCATION_FAILED - redirect to sign-in on errors
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

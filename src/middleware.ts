import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/billing_disabled/webhook",
  // Desktop app auth endpoints (use their own JWT validation)
  "/api/auth/desktop/(.*)",
  // Desktop sync endpoints (use their own JWT validation)
  "/api/desktop/(.*)",
  // Agent status endpoint (used by mobile/dashboard)
  "/api/agent/status",
]);

// Define API routes that need JWT validation
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  try {
    // Allow public routes
    if (isPublicRoute(request)) {
      return;
    }

    // For API routes, check for Bearer token (desktop app auth)
    if (isApiRoute(request)) {
      const authHeader = request.headers.get("Authorization");

      // If there's a Bearer token, let the API route handle validation
      if (authHeader?.startsWith("Bearer ")) {
        return;
      }
    }

    // Protect all other routes
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

import { auth } from "@clerk/nextjs/server";

/**
 * Get the current user's Clerk ID from server context
 * Throws if not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

/**
 * Get the current user's Clerk ID from server context
 * Returns null if not authenticated
 */
export async function getAuthOptional() {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the JWT token for the current session
 * Used for desktop app authentication
 */
export async function getSessionToken() {
  const { getToken } = await auth();
  return getToken();
}

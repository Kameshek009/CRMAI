/**
 * Admin Configuration
 * Single admin user identified by Clerk user ID.
 */

export const ADMIN_CLERK_USER_ID = "user_39ewDfZRbsdJFKFJQzXPyiRvsGO";

export function isAdmin(clerkUserId: string | null | undefined): boolean {
  return clerkUserId === ADMIN_CLERK_USER_ID;
}

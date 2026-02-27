import { createClient, SupabaseClient } from "@supabase/supabase-js";

// IMPORTANT: NEXT_PUBLIC_ vars must be accessed as literal property names
// (not via computed keys) so Next.js can inline them at build time.
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase client for client-side operations
 * Uses anon key for safe client-side usage (RLS policies apply)
 *
 * IMPORTANT: For data operations, use API routes (/api/chats, etc.)
 * This client is primarily for realtime subscriptions.
 *
 * Note: Using SupabaseClient without generic Database type parameter because
 * we don't have generated database types. The client is fully functional;
 * table/column names are simply untyped (string-based) rather than narrowed
 * to specific schema types. This is acceptable because RLS policies provide
 * runtime safety and most data access goes through API routes.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a Supabase client with custom auth token
 * Used for authenticated API requests
 */
export function createSupabaseClient(accessToken?: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  });
}

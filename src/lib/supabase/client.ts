import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for client-side operations
 * Uses anon key for safe client-side usage (RLS policies apply)
 *
 * IMPORTANT: For data operations, use API routes (/api/chats, etc.)
 * This client is primarily for realtime subscriptions.
 *
 * Note: Using any type due to supabase-js type inference issues
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a Supabase client with custom auth token
 * Used for authenticated API requests
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseClient(accessToken?: string): any {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  });
}

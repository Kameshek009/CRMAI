import { createClient } from "@supabase/supabase-js";

/**
 * Create a new Supabase admin client for server-side operations
 * Uses the service role key - bypasses RLS
 * Only use in API routes and server actions
 * Note: Using untyped client to avoid Turbopack type inference issues
 */
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

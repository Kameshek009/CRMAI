import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a new Supabase admin client for server-side operations.
 * Uses the service role key - bypasses RLS.
 * Only use in API routes and server actions.
 *
 * Returns SupabaseClient without a generic Database type parameter because
 * we don't maintain generated database types for this project. The client
 * is fully functional; table/column names are string-based rather than
 * narrowed to specific schema types. The service role key provides full
 * access, and input validation is handled at the API route level via Zod schemas.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

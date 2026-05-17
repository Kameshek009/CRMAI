import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-auth/generate-key";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  scopes: z.array(z.string().regex(/^[a-z][a-z0-9_]*(:([a-z][a-z0-9_]*|\*))?$|^\*$/i, "Invalid scope")).min(1).max(50),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "ApiKeys",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, expires_at, last_used_at, last_used_ip, revoked_at, created_at, created_by_clerk_user_id")
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw new ApiError("Failed to fetch API keys", 500);

    return NextResponse.json({ success: true, data });
  },
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: createApiKeySchema,
    logTag: "ApiKeys",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { plaintext, prefix, hash } = generateApiKey();

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        name: body.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: body.scopes,
        expires_at: body.expiresAt ?? null,
      })
      .select("id, name, key_prefix, scopes, expires_at, created_at")
      .single();

    if (error || !data) throw new ApiError("Failed to create API key", 500);

    // The plaintext key is returned ONCE — clients must persist it; we cannot show it again.
    return NextResponse.json({
      success: true,
      data: { ...data, plaintext },
    });
  },
);

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";

const upsertSchema = z.object({
  currency_code: z.string().min(3).max(3),
  rate_to_usd: z.number().positive(),
  symbol: z.string().max(5).optional(),
});

const deleteSchema = z.object({
  currency_code: z.string().min(3).max(3),
});

export const GET = withApiHandler(
  { logTag: "Currencies" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("team_id", id)
      .order("currency_code");

    if (dbError) throw new ApiError("Failed to fetch currencies", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    bodySchema: upsertSchema,
    logTag: "Currencies",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("currency_rates")
      .upsert(
        {
          team_id: id,
          currency_code: body.currency_code.toUpperCase(),
          rate_to_usd: body.rate_to_usd,
          symbol: body.symbol || "$",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,currency_code" }
      )
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to save currency", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    bodySchema: deleteSchema,
    logTag: "Currencies",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("currency_rates")
      .delete()
      .eq("team_id", id)
      .eq("currency_code", body.currency_code.toUpperCase());

    if (dbError) throw new ApiError("Failed to delete currency", 500);

    return NextResponse.json({ success: true });
  }
);

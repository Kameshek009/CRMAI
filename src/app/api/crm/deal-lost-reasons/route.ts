import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().min(1).max(200),
  position: z.number().optional(),
});

export const GET = withApiHandler(
  { logTag: "LostReasons" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_lost_reasons")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("position");

    if (dbError) throw new ApiError("Failed to fetch reasons", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: createSchema,
    logTag: "LostReasons",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_lost_reasons")
      .insert({
        team_id: ctx.workspaceId,
        label: body.label,
        position: body.position ?? 0,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create reason", 500);

    return NextResponse.json({ success: true, data });
  }
);

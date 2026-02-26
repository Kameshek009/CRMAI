import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const createLayoutSchema = z.object({
  name: z.string().min(1).max(100),
  widgets: z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  is_default: z.boolean().optional(),
});

export const GET = withApiHandler(
  { logTag: "DashboardLayouts" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("dashboard_layouts")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch layouts", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const POST = withApiHandler(
  {
    bodySchema: createLayoutSchema,
    logTag: "DashboardLayouts",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    // If setting as default, unset other defaults
    if (body.is_default) {
      await supabase
        .from("dashboard_layouts")
        .update({ is_default: false })
        .eq("team_id", ctx.workspaceId)
        .eq("account_id", ctx.accountId);
    }

    const { data, error: dbError } = await supabase
      .from("dashboard_layouts")
      .insert({
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        name: body.name,
        widgets: body.widgets,
        is_default: body.is_default ?? true,
      })
      .select("*")
      .single();

    if (dbError) throw new ApiError("Failed to create layout", 500);

    return NextResponse.json({ success: true, data });
  }
);

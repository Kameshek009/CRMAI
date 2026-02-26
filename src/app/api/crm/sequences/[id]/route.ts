import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateSequenceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
  trigger_type: z.enum(["manual", "on_create", "on_stage_change"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withApiHandler(
  { logTag: "Sequences" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .select("*, email_sequence_steps(*)")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: "Sequence not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: updateSequenceSchema,
    logTag: "Sequences",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to update sequence", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "Sequences",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("email_sequences")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete sequence", 500);

    return NextResponse.json({ success: true });
  }
);

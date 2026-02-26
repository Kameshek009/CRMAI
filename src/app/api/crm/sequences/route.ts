import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const createSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  trigger_type: z.enum(["manual", "on_create", "on_stage_change"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withApiHandler(
  { logTag: "Sequences" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .select("*, email_sequence_steps(id), email_sequence_enrollments(id, status)")
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch sequences", 500);

    const enriched = (data || []).map((seq) => ({
      ...seq,
      step_count: seq.email_sequence_steps?.length || 0,
      active_enrollments: (seq.email_sequence_enrollments || []).filter(
        (e: { status: string }) => e.status === "active"
      ).length,
      total_enrollments: seq.email_sequence_enrollments?.length || 0,
      email_sequence_steps: undefined,
      email_sequence_enrollments: undefined,
    }));

    return NextResponse.json({ success: true, data: enriched });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    featureLimit: "emailSequences",
    bodySchema: createSequenceSchema,
    logTag: "Sequences",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .insert({
        team_id: ctx.workspaceId,
        created_by: ctx.accountId,
        ...body,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create sequence", 500);

    return NextResponse.json({ success: true, data });
  }
);

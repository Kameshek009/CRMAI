import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  trigger_type: z.enum(["manual", "on_create", "on_stage_change"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .select("*, email_sequence_steps(id), email_sequence_enrollments(id, status)")
      .eq("team_id", context.workspaceId)
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("Sequences", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch sequences" }, { status: 500 });
    }

    // Enrich with counts
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
  } catch (error) {
    logger.error("Sequences", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const limitError = await requireFeatureLimit(context.workspaceId, context.tier, "emailSequences");
    if (limitError) return limitError;

    const body = await request.json();
    const parsed = createSequenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .insert({
        team_id: context.workspaceId,
        created_by: context.accountId,
        ...parsed.data,
      })
      .select()
      .single();

    if (dbError) {
      logger.error("Sequences", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create sequence" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Sequences", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

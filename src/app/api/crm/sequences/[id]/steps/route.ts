import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const createStepSchema = z.object({
  position: z.number().int().min(0),
  delay_days: z.number().int().min(0).max(365),
  subject: z.string().max(500),
  body: z.string().max(10000),
});

export const GET = withApiHandler(
  { logTag: "SeqSteps" },
  async (_request, _ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_steps")
      .select("*")
      .eq("sequence_id", id)
      .order("position", { ascending: true });

    if (dbError) throw new ApiError("Failed to fetch steps", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: createStepSchema,
    logTag: "SeqSteps",
  },
  async (_request, _ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_steps")
      .insert({ sequence_id: id, ...body })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create step", 500);

    return NextResponse.json({ success: true, data });
  }
);

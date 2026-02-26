import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
  enrollment_id: z.string().uuid(),
  status: z.enum(["active", "paused", "completed", "exited_reply"]),
});

export const GET = withApiHandler(
  { logTag: "SeqEnrollments" },
  async (_request, _ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_enrollments")
      .select("*, contacts(id, first_name, last_name, email)")
      .eq("sequence_id", id)
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch enrollments", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const PATCH = withApiHandler(
  {
    bodySchema: updateEnrollmentSchema,
    logTag: "SeqEnrollments",
  },
  async (_request, _ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_enrollments")
      .update({
        status: body.enrollment_id ? body.status : body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.enrollment_id)
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to update enrollment", 500);

    return NextResponse.json({ success: true, data });
  }
);

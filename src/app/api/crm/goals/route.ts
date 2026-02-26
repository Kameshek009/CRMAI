import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createGoalSchema } from "@/lib/crm/validation";

export const GET = withApiHandler(
  { logTag: "Goals" },
  async (request, ctx) => {
    const period = request.nextUrl.searchParams.get("period") || "all";
    const scope = request.nextUrl.searchParams.get("scope") || "all"; // my, team, all

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("goals")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (period !== "all") {
      query = query.eq("period", period);
    }

    if (scope === "my") {
      query = query.eq("account_id", ctx.accountId);
    } else if (scope === "team") {
      query = query.is("account_id", null);
    }

    const { data, error: dbError } = await query;

    if (dbError) throw new ApiError("Failed to fetch goals", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    bodySchema: createGoalSchema,
    logTag: "Goals",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("goals")
      .insert({
        team_id: ctx.workspaceId,
        account_id: body.account_id === "self" ? ctx.accountId : body.account_id || null,
        created_by: ctx.accountId,
        type: body.type,
        target_value: body.target_value,
        period: body.period,
        start_date: body.start_date,
        end_date: body.end_date,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create goal", 500);

    return NextResponse.json({ success: true, data });
  }
);

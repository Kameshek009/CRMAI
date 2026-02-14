import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { updateDealStageSchema } from "@/lib/crm/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateDealStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Get current deal
    const { data: deal } = await supabase
      .from("deals")
      .select("id, title, stage_id, value")
      .eq("id", id)
      .eq("account_id", accountId)
      .single();

    if (!deal) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    // Get new stage info
    const { data: newStage } = await supabase
      .from("deal_stages")
      .select("id, name, is_won, is_lost")
      .eq("id", parsed.data.stage_id)
      .eq("account_id", accountId)
      .single();

    if (!newStage) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    // Update deal
    const updateData: Record<string, unknown> = { stage_id: parsed.data.stage_id };
    if (newStage.is_won) {
      updateData.status = "won";
      updateData.actual_close_date = new Date().toISOString().split("T")[0];
    } else if (newStage.is_lost) {
      updateData.status = "lost";
      updateData.actual_close_date = new Date().toISOString().split("T")[0];
    } else {
      updateData.status = "open";
    }

    const { data: updated, error: dbError } = await supabase
      .from("deals")
      .update(updateData)
      .eq("id", id)
      .select("*, deal_stages(id, name, color)")
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("crm_activities").insert({
      account_id: accountId,
      deal_id: id,
      type: newStage.is_won ? "deal_won" : newStage.is_lost ? "deal_lost" : "deal_stage_changed",
      title: `Deal "${deal.title}" moved to ${newStage.name}`,
      metadata: {
        from_stage_id: deal.stage_id,
        to_stage_id: newStage.id,
        value: deal.value,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

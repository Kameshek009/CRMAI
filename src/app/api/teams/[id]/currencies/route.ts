import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const upsertSchema = z.object({
  currency_code: z.string().min(3).max(3),
  rate_to_usd: z.number().positive(),
  symbol: z.string().max(5).optional(),
});

const deleteSchema = z.object({
  currency_code: z.string().min(3).max(3),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("team_id", id)
      .order("currency_code");

    if (dbError) {
      logger.error("Currencies", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch currencies" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error("Currencies", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("currency_rates")
      .upsert(
        {
          team_id: id,
          currency_code: parsed.data.currency_code.toUpperCase(),
          rate_to_usd: parsed.data.rate_to_usd,
          symbol: parsed.data.symbol || "$",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,currency_code" }
      )
      .select()
      .single();

    if (dbError) {
      logger.error("Currencies", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to save currency" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Currencies", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("currency_rates")
      .delete()
      .eq("team_id", id)
      .eq("currency_code", parsed.data.currency_code.toUpperCase());

    if (dbError) {
      logger.error("Currencies", "DELETE error", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete currency" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Currencies", "DELETE error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

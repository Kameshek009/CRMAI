import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(500).default(""),
  body: z.string().max(10000),
  category: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read", context.isDirector);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("team_id", context.teamId)
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("EmailTemplates", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error("EmailTemplates", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .insert({
        team_id: context.teamId,
        account_id: context.accountId,
        ...parsed.data,
      })
      .select()
      .single();

    if (dbError) {
      logger.error("EmailTemplates", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create template" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("EmailTemplates", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

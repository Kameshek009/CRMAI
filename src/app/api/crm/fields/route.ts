import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const VALID_ENTITY_TYPES = ["contact", "company", "deal", "lead"];
const VALID_FIELD_TYPES = [
  "text", "number", "date", "select", "multi_select",
  "url", "email", "phone", "boolean", "currency", "percent", "textarea",
];

const createFieldSchema = z.object({
  entity_type: z.enum(VALID_ENTITY_TYPES as [string, ...string[]]),
  field_key: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, "Must be lowercase snake_case"),
  label: z.string().min(1).max(100),
  field_type: z.enum(VALID_FIELD_TYPES as [string, ...string[]]),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
  })).optional(),
  is_required: z.boolean().optional(),
  position: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("field_definitions")
      .select("*")
      .eq("team_id", context.workspaceId)
      .order("position", { ascending: true });

    if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error: dbError } = await query;

    if (dbError) {
      logger.error("Fields", "Failed to fetch fields", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch fields" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Fields", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    // Only admins/owners can create custom fields
    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createFieldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("field_definitions")
      .insert({
        team_id: context.workspaceId,
        ...parsed.data,
      })
      .select()
      .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json({ success: false, error: "A field with this key already exists" }, { status: 409 });
      }
      logger.error("Fields", "Failed to create field", dbError);
      return NextResponse.json({ success: false, error: "Failed to create field" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Fields", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

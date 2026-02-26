import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
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

export const GET = withApiHandler(
  { logTag: "Fields" },
  async (request, ctx) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("field_definitions")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("position", { ascending: true });

    if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error: dbError } = await query;

    if (dbError) throw new ApiError("Failed to fetch fields", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    featureLimit: "customFields",
    bodySchema: createFieldSchema,
    logTag: "Fields",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("field_definitions")
      .insert({ team_id: ctx.workspaceId, ...body })
      .select()
      .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json({ success: false, error: "A field with this key already exists" }, { status: 409 });
      }
      logger.error("Fields", "Failed to create field", dbError);
      throw new ApiError("Failed to create field", 500);
    }

    return NextResponse.json({ success: true, data });
  }
);

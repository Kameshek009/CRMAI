import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  uploadCrmAttachment,
  deleteCrmAttachment,
  CRM_ATTACHMENT_BUCKET,
  type Attachment,
  type CrmEntityType,
} from "@/lib/supabase/storage";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";
import type { WorkspacePermissions } from "@/types/team";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 15;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const ENTITY_CONFIG: Record<
  CrmEntityType,
  { table: string; permResource: keyof WorkspacePermissions }
> = {
  contacts: { table: "contacts", permResource: "contacts" },
  companies: { table: "companies", permResource: "companies" },
  deals: { table: "deals", permResource: "deals" },
  leads: { table: "leads", permResource: "leads" },
};

export async function handleAttachmentUpload(
  request: NextRequest,
  entityType: CrmEntityType,
  entityId: string
) {
  try {
    if (!isValidUUID(entityId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const { context, error } = await getTeamContext();
    if (error) return error;

    const config = ENTITY_CONFIG[entityType];
    const permError = requirePermission(context.permissions, config.permResource, "update", context.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    const { data: entity, error: dbError } = await supabase
      .from(config.table)
      .select("id, metadata")
      .eq("id", entityId)
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !entity) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const existing: Attachment[] =
      ((entity.metadata as Record<string, unknown>)?.attachments as Attachment[]) || [];

    if (existing.length >= MAX_ATTACHMENTS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_ATTACHMENTS} attachments` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "File too large. Maximum 5MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Only images allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadCrmAttachment(
      buffer, file.name, file.type, context.workspaceId, entityType, entityId
    );

    const updatedAttachments = [...existing, attachment];
    const metadata = {
      ...((entity.metadata as Record<string, unknown>) || {}),
      attachments: updatedAttachments,
    };

    const { error: updateErr } = await supabase
      .from(config.table)
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", entityId);

    if (updateErr) {
      logger.error("CrmAttachment", "Failed to save attachment metadata", updateErr);
      return NextResponse.json({ success: false, error: "Failed to save attachment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, attachment, attachments: updatedAttachments });
  } catch (err) {
    logger.error("CrmAttachment", `Upload failed for ${entityType}`, err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}

export async function handleAttachmentDelete(
  request: NextRequest,
  entityType: CrmEntityType,
  entityId: string
) {
  try {
    if (!isValidUUID(entityId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const { context, error } = await getTeamContext();
    if (error) return error;

    const config = ENTITY_CONFIG[entityType];
    const permError = requirePermission(context.permissions, config.permResource, "update", context.isOwner);
    if (permError) return permError;

    const { attachmentId } = (await request.json()) as { attachmentId: string };
    if (!attachmentId) {
      return NextResponse.json({ success: false, error: "attachmentId required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: entity, error: dbError } = await supabase
      .from(config.table)
      .select("id, metadata")
      .eq("id", entityId)
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !entity) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const existing: Attachment[] =
      ((entity.metadata as Record<string, unknown>)?.attachments as Attachment[]) || [];
    const toDelete = existing.find((a) => a.id === attachmentId);

    if (!toDelete) {
      return NextResponse.json({ success: false, error: "Attachment not found" }, { status: 404 });
    }

    const url = new URL(toDelete.url);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${CRM_ATTACHMENT_BUCKET}/`);
    if (pathParts[1]) {
      await deleteCrmAttachment(decodeURIComponent(pathParts[1]));
    }

    const updatedAttachments = existing.filter((a) => a.id !== attachmentId);
    const metadata = {
      ...((entity.metadata as Record<string, unknown>) || {}),
      attachments: updatedAttachments,
    };

    const { error: updateErr } = await supabase
      .from(config.table)
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", entityId);

    if (updateErr) {
      logger.error("CrmAttachment", "Failed to update attachment metadata", updateErr);
      return NextResponse.json({ success: false, error: "Failed to update metadata" }, { status: 500 });
    }

    return NextResponse.json({ success: true, attachments: updatedAttachments });
  } catch (err) {
    logger.error("CrmAttachment", `Delete failed for ${entityType}`, err);
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}

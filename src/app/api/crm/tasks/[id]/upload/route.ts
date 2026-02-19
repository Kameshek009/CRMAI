import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { uploadTaskImage, deleteTaskImage, type Attachment } from "@/lib/supabase/storage";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "tasks", "update", context.isOwner);
    if (permError) return permError;

    const { id: taskId } = await params;
    const supabase = createSupabaseAdmin();

    // Verify task belongs to team
    const { data: task, error: taskError } = await supabase
      .from("crm_tasks")
      .select("id, metadata")
      .eq("id", taskId)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const existing: Attachment[] = (task.metadata as Record<string, unknown>)?.attachments as Attachment[] || [];
    if (existing.length >= MAX_ATTACHMENTS) {
      return NextResponse.json({ success: false, error: `Maximum ${MAX_ATTACHMENTS} photos` }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "Only images allowed (JPEG, PNG, GIF, WebP)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadTaskImage(buffer, file.name, file.type, context.teamId, taskId);

    const updatedAttachments = [...existing, attachment];
    const metadata = { ...((task.metadata as Record<string, unknown>) || {}), attachments: updatedAttachments };

    await supabase
      .from("crm_tasks")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    return NextResponse.json({ success: true, attachment, attachments: updatedAttachments });
  } catch (err) {
    logger.error("TaskUpload", "Failed to upload", err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "tasks", "update", context.isOwner);
    if (permError) return permError;

    const { id: taskId } = await params;
    const { attachmentId } = await request.json() as { attachmentId: string };

    if (!attachmentId) {
      return NextResponse.json({ success: false, error: "attachmentId required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: task, error: taskError } = await supabase
      .from("crm_tasks")
      .select("id, metadata")
      .eq("id", taskId)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const existing: Attachment[] = (task.metadata as Record<string, unknown>)?.attachments as Attachment[] || [];
    const toDelete = existing.find(a => a.id === attachmentId);

    if (!toDelete) {
      return NextResponse.json({ success: false, error: "Attachment not found" }, { status: 404 });
    }

    // Extract storage path from URL
    const url = new URL(toDelete.url);
    const pathParts = url.pathname.split("/storage/v1/object/public/task-attachments/");
    if (pathParts[1]) {
      await deleteTaskImage(decodeURIComponent(pathParts[1]));
    }

    const updatedAttachments = existing.filter(a => a.id !== attachmentId);
    const metadata = { ...((task.metadata as Record<string, unknown>) || {}), attachments: updatedAttachments };

    await supabase
      .from("crm_tasks")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    return NextResponse.json({ success: true, attachments: updatedAttachments });
  } catch (err) {
    logger.error("TaskUpload", "Failed to delete", err);
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}

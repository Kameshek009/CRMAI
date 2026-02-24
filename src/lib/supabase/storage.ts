import { createSupabaseAdmin } from "./server";

const BUCKET_NAME = "chat-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "File type not supported";
  }
  return null;
}

export async function ensureBucket() {
  const supabase = createSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
  }
}

export async function uploadChatFile(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  accountId: string,
  chatId: string
): Promise<Attachment> {
  const supabase = createSupabaseAdmin();
  await ensureBucket();

  const fileId = crypto.randomUUID();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${accountId}/${chatId}/${fileId}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    id: fileId,
    url: urlData.publicUrl,
    filename,
    mime_type: mimeType,
    size: fileBuffer.byteLength,
  };
}

export async function deleteChatFile(storagePath: string) {
  const supabase = createSupabaseAdmin();
  await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
}

// ─── Task attachments ───────────────────────────────────────

const TASK_BUCKET = "task-attachments";
const TASK_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const TASK_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function validateTaskImage(file: File): string | null {
  if (file.size > TASK_MAX_SIZE) return `File too large. Maximum size is 5MB`;
  if (!TASK_ALLOWED_TYPES.includes(file.type)) return "Only images allowed (JPEG, PNG, GIF, WebP)";
  return null;
}

async function ensureTaskBucket() {
  const supabase = createSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === TASK_BUCKET)) {
    await supabase.storage.createBucket(TASK_BUCKET, {
      public: true,
      fileSizeLimit: TASK_MAX_SIZE,
      allowedMimeTypes: TASK_ALLOWED_TYPES,
    });
  }
}

export async function uploadTaskImage(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  teamId: string,
  taskId: string
): Promise<Attachment> {
  const supabase = createSupabaseAdmin();
  await ensureTaskBucket();

  const fileId = crypto.randomUUID();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${teamId}/${taskId}/${fileId}_${safeName}`;

  const { error } = await supabase.storage
    .from(TASK_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(TASK_BUCKET).getPublicUrl(storagePath);

  return {
    id: fileId,
    url: urlData.publicUrl,
    filename,
    mime_type: mimeType,
    size: fileBuffer.byteLength,
  };
}

export async function deleteTaskImage(storagePath: string) {
  const supabase = createSupabaseAdmin();
  await supabase.storage.from(TASK_BUCKET).remove([storagePath]);
}

// ─── CRM entity attachments ──────────────────────────────────

const CRM_BUCKET = "crm-attachments";
const CRM_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const CRM_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export type CrmEntityType = "contacts" | "companies" | "deals" | "leads";

export function validateCrmAttachment(file: File): string | null {
  if (file.size > CRM_MAX_SIZE) return "File too large. Maximum size is 5MB";
  if (!CRM_ALLOWED_TYPES.includes(file.type)) return "Only images allowed (JPEG, PNG, GIF, WebP)";
  return null;
}

async function ensureCrmBucket() {
  const supabase = createSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === CRM_BUCKET)) {
    await supabase.storage.createBucket(CRM_BUCKET, {
      public: true,
      fileSizeLimit: CRM_MAX_SIZE,
      allowedMimeTypes: CRM_ALLOWED_TYPES,
    });
  }
}

export async function uploadCrmAttachment(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  teamId: string,
  entityType: CrmEntityType,
  entityId: string
): Promise<Attachment> {
  const supabase = createSupabaseAdmin();
  await ensureCrmBucket();

  const fileId = crypto.randomUUID();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${teamId}/${entityType}/${entityId}/${fileId}_${safeName}`;

  const { error } = await supabase.storage
    .from(CRM_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(CRM_BUCKET).getPublicUrl(storagePath);

  return {
    id: fileId,
    url: urlData.publicUrl,
    filename,
    mime_type: mimeType,
    size: fileBuffer.byteLength,
  };
}

export async function deleteCrmAttachment(storagePath: string) {
  const supabase = createSupabaseAdmin();
  await supabase.storage.from(CRM_BUCKET).remove([storagePath]);
}

export const CRM_ATTACHMENT_BUCKET = CRM_BUCKET;

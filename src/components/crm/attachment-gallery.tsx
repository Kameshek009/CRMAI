"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import type { Attachment } from "@/lib/supabase/storage";
import type { CrmEntityType } from "@/lib/supabase/storage";

interface AttachmentGalleryProps {
  entityType: CrmEntityType;
  entityId: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  maxAttachments?: number;
  readOnly?: boolean;
}

export function AttachmentGallery({
  entityType,
  entityId,
  attachments,
  onAttachmentsChange,
  maxAttachments = 15,
  readOnly = false,
}: AttachmentGalleryProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (attachments.length >= maxAttachments) {
      toast.error(t("crm.attachments.maxReached", { max: String(maxAttachments) }));
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/crm/${entityType}/${entityId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        onAttachmentsChange(json.attachments);
        toast.success(t("crm.attachments.uploaded"));
      } else {
        toast.error(json.error || t("crm.attachments.uploadFailed"));
      }
    } catch {
      toast.error(t("crm.attachments.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/crm/${entityType}/${entityId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });
      const json = await res.json();
      if (json.success) {
        onAttachmentsChange(json.attachments);
        toast.success(t("crm.attachments.deleted"));
      } else {
        toast.error(json.error || t("crm.attachments.deleteFailed"));
      }
    } catch {
      toast.error(t("crm.attachments.deleteFailed"));
    }
  };

  if (attachments.length === 0 && readOnly) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ImageOff className="size-8 mb-2" />
        <p className="text-sm">{t("crm.attachments.noAttachments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => (
          <div key={att.id} className="relative group size-20 rounded-md overflow-hidden border">
            <a href={att.url} target="_blank" rel="noreferrer">
              <Image src={att.url} alt={att.filename} fill className="object-cover" unoptimized />
            </a>
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleDelete(att.id)}
                className="absolute top-0.5 right-0.5 size-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete ${att.filename}`}
              >
                <X className="size-3 text-white" />
              </button>
            )}
          </div>
        ))}
        {!readOnly && attachments.length < maxAttachments && (
          <label className="size-20 rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
            {isUploading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="size-5 text-muted-foreground" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={isUploading}
              aria-label={t("crm.attachments.uploadAttachment")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {attachments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("crm.attachments.counter", {
            count: String(attachments.length),
            max: String(maxAttachments),
          })}
        </p>
      )}
    </div>
  );
}

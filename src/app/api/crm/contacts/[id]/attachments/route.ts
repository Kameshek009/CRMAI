import { NextRequest } from "next/server";
import { handleAttachmentUpload, handleAttachmentDelete } from "@/lib/crm/attachment-handler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleAttachmentUpload(request, "contacts", id);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleAttachmentDelete(request, "contacts", id);
}

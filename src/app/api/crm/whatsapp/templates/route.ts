import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    logTag: "WhatsApp",
  },
  async (_request, ctx) => {
    const config = await getWhatsAppConfig(ctx.workspaceId);
    if (!config) {
      return NextResponse.json({ success: true, data: [] });
    }

    const client = new WhatsAppClient(config);
    const templates = await client.getTemplates();

    return NextResponse.json({ success: true, data: templates });
  }
);

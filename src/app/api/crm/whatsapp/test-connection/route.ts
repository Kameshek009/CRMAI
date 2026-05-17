import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { setWhatsAppConnectedFlag, WhatsAppMigrationPlaintextError } from "@/lib/whatsapp/store";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export const POST = withApiHandler(
  { logTag: "WhatsApp" },
  async (_request, ctx) => {
    if (!ctx.isOwner) {
      return NextResponse.json(
        { success: false, error: "Only admins can test connection" },
        { status: 403 },
      );
    }

    let config;
    try {
      config = await getWhatsAppConfig(ctx.workspaceId);
    } catch (e) {
      if (e instanceof WhatsAppMigrationPlaintextError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Settings were migrated from a legacy format — please re-save your access token to continue.",
          },
          { status: 400 },
        );
      }
      throw e;
    }
    if (!config) {
      return NextResponse.json(
        { success: false, error: "WhatsApp not configured" },
        { status: 400 },
      );
    }

    const client = new WhatsAppClient(config);
    const profile = await client.getBusinessProfile();
    await setWhatsAppConnectedFlag(ctx.workspaceId, true, profile.name);
    return NextResponse.json({
      success: true,
      data: { name: profile.name, about: profile.about },
    });
  },
);

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { isHubSpotConfigured } from "@/lib/importers/hubspot/oauth";
import { isAmoCRMConfigured } from "@/lib/importers/amocrm/oauth";
import { isBitrix24Configured } from "@/lib/importers/bitrix24/oauth";
import { isSalesforceConfigured } from "@/lib/importers/salesforce/oauth";
import { getOAuthConnection } from "@/lib/oauth/tokens";

interface ProviderStatus {
  id: "hubspot" | "amocrm" | "bitrix24" | "salesforce";
  label: string;
  configured: boolean;
  connected: boolean;
  connected_at: string | null;
  connection_metadata: Record<string, unknown> | null;
}

/**
 * GET /api/crm/import/providers/status
 * For the importer UI: tells which providers are configured server-side
 * and which the workspace is currently connected to.
 */
export const GET = withApiHandler(
  { permission: { resource: "contacts", action: "read" }, logTag: "Importer" },
  async (_request, ctx) => {
    const [hubspotConn, amocrmConn, bitrix24Conn, salesforceConn] = await Promise.all([
      getOAuthConnection(ctx.workspaceId, "hubspot"),
      getOAuthConnection(ctx.workspaceId, "amocrm"),
      getOAuthConnection(ctx.workspaceId, "bitrix24"),
      getOAuthConnection(ctx.workspaceId, "salesforce"),
    ]);

    const data: ProviderStatus[] = [
      {
        id: "hubspot",
        label: "HubSpot",
        configured: isHubSpotConfigured(),
        connected: Boolean(hubspotConn),
        connected_at: (hubspotConn?.metadata?.connected_at as string) ?? null,
        connection_metadata: hubspotConn?.metadata ?? null,
      },
      {
        id: "amocrm",
        label: "amoCRM / Kommo",
        configured: isAmoCRMConfigured(),
        connected: Boolean(amocrmConn),
        connected_at: (amocrmConn?.metadata?.connected_at as string) ?? null,
        connection_metadata: amocrmConn?.metadata ?? null,
      },
      {
        id: "bitrix24",
        label: "Bitrix24",
        configured: isBitrix24Configured(),
        connected: Boolean(bitrix24Conn),
        connected_at: (bitrix24Conn?.metadata?.connected_at as string) ?? null,
        connection_metadata: bitrix24Conn?.metadata ?? null,
      },
      {
        id: "salesforce",
        label: "Salesforce",
        configured: isSalesforceConfigured(),
        connected: Boolean(salesforceConn),
        connected_at: (salesforceConn?.metadata?.connected_at as string) ?? null,
        connection_metadata: salesforceConn?.metadata ?? null,
      },
    ];

    return NextResponse.json({ success: true, data });
  },
);

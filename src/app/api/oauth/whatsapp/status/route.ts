import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { isEmbeddedSignupConfigured } from "@/lib/whatsapp/embedded-signup";

/**
 * GET /api/oauth/whatsapp/status
 * Returns whether Embedded Signup is configured on this deployment.
 * Used by the UI to enable / disable the "Connect via Meta" button.
 */
export const GET = withApiHandler(
  { logTag: "WhatsAppEmbedded" },
  async () => {
    return NextResponse.json({
      success: true,
      data: { embedded_signup_configured: isEmbeddedSignupConfigured() },
    });
  },
);

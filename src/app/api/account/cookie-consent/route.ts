import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { COOKIE_CONSENT_VERSION } from "@/lib/gdpr/config";

const bodySchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
});

// Mirrors the client-side cookie into accounts.cookie_consent so we have a
// server-side audit trail. Unauthenticated requests are accepted as 204 —
// the cookie alone is sufficient for not-yet-signed-up visitors.
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createSupabaseAdmin();
  const consent = {
    essential: true,
    analytics: parsed.data.analytics,
    marketing: parsed.data.marketing,
    ts: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };

  const { error } = await supabase
    .from("accounts")
    .update({ cookie_consent: consent })
    .eq("clerk_user_id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, consent });
}

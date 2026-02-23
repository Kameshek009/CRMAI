import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  try {
    const dbStart = Date.now();
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("accounts").select("id").limit(1);
    checks.database = {
      status: error ? "degraded" : "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: "unhealthy" };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      latencyMs: Date.now() - start,
    },
    { status: allHealthy ? 200 : 503 }
  );
}

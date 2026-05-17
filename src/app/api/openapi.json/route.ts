import { NextResponse } from "next/server";
import { buildOpenAPIDocument } from "@/lib/openapi/registry";
import "@/lib/openapi/routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const document = buildOpenAPIDocument();
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

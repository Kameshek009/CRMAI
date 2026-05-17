import { NextResponse } from "next/server";
import { buildOpenAPIDocument } from "@/lib/openapi/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const document = await buildOpenAPIDocument();
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

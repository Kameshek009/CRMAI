import { NextResponse } from "next/server";

/**
 * Minimal TwiML for outbound click-to-call. Twilio fetches this URL when
 * the callee picks up; we play a short prompt then end. Production
 * deployments will typically swap this for a `<Dial>` to the agent or a
 * conference room.
 */
export async function GET() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hello, you are now connected.</Say></Response>`;
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST() {
  return GET();
}

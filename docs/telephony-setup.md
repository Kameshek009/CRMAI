# Telephony setup — Twilio (Mango Office coming)

Click-to-call from any contact / lead / deal, with status callbacks
landing in `call_logs` and emitting domain events the rest of the CRM
can react to.

The implementation is **per-tenant BYO Twilio** — each workspace owner
brings their own Twilio account and pays Twilio directly. No env vars
are required server-side; everything lives in the encrypted
`telephony_settings` row.

---

## 1. Create a Twilio account

1. Sign up at https://www.twilio.com/try-twilio. A trial account gives
   $15 in credit and a single sandbox phone number.
2. Confirm your personal phone number for verification.
3. Move past the onboarding wizard into the Twilio Console.

## 2. Buy a phone number (or use the trial number)

1. Console → **Phone Numbers → Manage → Buy a number**.
2. Pick a country + number with **Voice** capability.
3. Cost: ~$1/month for a US local number, more for toll-free or
   international. Trial accounts can use the auto-issued sandbox number
   for testing.

## 3. Find your credentials

Console → top-right account widget:
- **Account SID** (starts with `AC...`) — paste into the Nexxus
  integrations UI.
- **Auth Token** — same field, masked once saved.

For production we recommend creating an **API Key + Secret** instead
of the master auth_token (Console → Account → API keys & tokens →
Create API Key, Type: Standard). The pair lets you revoke a single key
without rotating the auth_token for every app.

## 4. Configure Nexxus

1. Open `/dashboard/account?tab=integrations` (admin / owner only).
2. The Telephony card asks for:
   - Account SID
   - Auth Token (or API Key SID + Secret)
   - From number (E.164, e.g. `+12025550100`)
3. Save. Nexxus stores everything AES-256-GCM encrypted via
   `TOKEN_ENCRYPTION_KEY`.

## 5. Webhook setup in Twilio

Twilio POSTs status callbacks (`initiated`, `ringing`, `answered`,
`completed`) to our webhook. Nexxus passes the callback URL on each
outbound call, so there's nothing to configure in Twilio Console —
just allow outbound HTTPS to your Nexxus deployment.

The callback URL is `${NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice`.
Each request carries `X-Twilio-Signature: <base64>` (HMAC-SHA1 of
`<full URL> + sorted(params).join("")` with your auth_token as key).
Nexxus rejects anything that fails verification.

## 6. Place a call

```http
POST /api/crm/telephony/calls
Authorization: Bearer <session>
Content-Type: application/json

{
  "to_number": "+19255551234",
  "contact_id": "uuid",
  "summary": "Following up on listing",
  "record": false
}
```

Response (202):
```json
{
  "success": true,
  "data": {
    "call_log_id": "uuid",
    "provider_call_id": "CA...",
    "status": "queued"
  }
}
```

A `call_logs` row is created pre-flight (status=initiated). Status
callbacks update the row in place and emit `call.completed` /
`call.missed` / `call.failed` events into the outbox.

## 7. Recording

Pass `"record": true` in the request and Twilio will record the call.
The recording URL lands in `call_logs.recording_url` after the call
completes. Storage is on Twilio's side and counts against your Twilio
plan.

## 8. Caveats

- **Compliance**: recording requires two-party consent in most US
  states and is restricted in many EU countries. Surface a recording
  notification to the caller (e.g. via TwiML `<Say>`) when you turn
  this on.
- **Cost**: Twilio Voice is per-minute. ~$0.013/min US-US outbound at
  the time of writing. Recording, transcription, and international
  destinations cost extra.
- **Trial number restrictions**: you can only call your verified
  personal number from a trial account. Upgrade Twilio to call
  arbitrary numbers.
- **TwiML**: the bundled `/api/webhooks/twilio/voice/twiml` plays a
  "Hello, you are now connected" message and ends the call. Production
  deployments will typically replace this with a `<Dial>` to the
  agent's number or a conference room. The TwiML URL is hard-coded for
  now; we'll surface it as a per-team setting once we have customer
  signal.
- **Mango Office**: the `TelephonyProvider` interface is provider-
  agnostic; a Mango implementation will plug in via the registry once
  there's customer demand. Track in the Phase 2 backlog.

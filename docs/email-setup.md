# Email outbound — Resend setup

Step-by-step to switch Nexxus from "log emails to the DB" to actually delivering them via Resend. Code is already in place; this guide is the external one-time configuration you do as the operator.

## What you'll need
- A domain you control (DNS records can be edited). E.g. `nexxuscrm.com`.
- ~30 minutes for DNS propagation.

## 1. Create a Resend account
1. Go to https://resend.com and sign up.
2. Free tier allows 100 emails/day, 3 000/month — fine for an MVP.

## 2. Add and verify your sending domain
In the Resend dashboard → **Domains** → **Add Domain**, enter your domain (e.g. `nexxuscrm.com`). Resend will display **3 DNS records** you must add:

| Type | Name | Purpose |
|---|---|---|
| TXT | `resend._domainkey.<domain>` | DKIM signing key |
| TXT | `send.<domain>` (or `<domain>`) | SPF (`v=spf1 include:amazonses.com ~all`) |
| MX | `send.<domain>` | Return path / bounce handling |

Add them at your DNS registrar (Cloudflare / Namecheap / Hetzner / wherever). Then click **Verify** in Resend — typically green within 5-30 min.

### DMARC (do this yourself, not shown by Resend)
Add one more TXT record so Gmail/Outlook don't junk you:
```
Name:  _dmarc.<domain>
Type:  TXT
Value: v=DMARC1; p=none; rua=mailto:postmaster@<domain>; pct=100; adkim=r; aspf=r
```
Start with `p=none` (monitor only) for the first 1-2 weeks. Once you see reports look clean, tighten to `p=quarantine` then `p=reject`.

## 3. Generate an API key
Dashboard → **API Keys** → **Create API Key** → name it `nexxus-production` (or `-dev`). Permission: **Full access** is fine; later you can scope to **Sending access**.

Copy the key (`re_xxx`) and put it in `.env` / Vercel env:
```
RESEND_API_KEY=re_xxx
EMAIL_FROM_DOMAIN=nexxuscrm.com
EMAIL_FROM_ADDRESS=Nexxus <hello@nexxuscrm.com>  # optional, overrides default
```

## 4. Configure the inbound delivery webhook
This is what lets Nexxus update `email_communications.delivered_at` / `bounced_at` / `opened_at` automatically.

Dashboard → **Webhooks** → **Add Endpoint**:
- **Endpoint URL**: `https://<your-vercel-domain>/api/webhooks/resend`
- **Events to send** (tick all): `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, `email.delivery_delayed`

After creation, click the endpoint, expand **Signing secret** → copy (`whsec_xxx`) into env:
```
RESEND_WEBHOOK_SECRET=whsec_xxx
```

The route verifies Svix-style signatures (`svix-id`, `svix-timestamp`, `svix-signature` headers) — without the secret, requests are 401'd. It's whitelisted in `src/proxy.ts` so Clerk auth doesn't get in the way.

## 5. Sanity-check end-to-end
After redeploy:

1. **Test direct send**: from a UI/API client, `POST /api/crm/emails` with `{direction: "outbound", to_emails: ["you@example.com"], subject: "test", body_html: "<p>hi</p>", contact_id: <some-id>}`. Expected: 200 + `{data: {id, provider_message_id}}`, you receive the email.
2. **Check DB**: row in `email_communications` with `status='sent'`, `provider='resend'`, `provider_message_id` set.
3. **Open the email** → within ~30 s the row should flip `opened_at` and the dispatcher should fan out `email.opened` to your subscribed `webhook_endpoints`.
4. **Send to a known-bad address** (e.g. `nosuchuser@yourdomain.com`) → row goes `bounced` with `bounced_at`.

## 6. Hooking into sequences
Once the steps above work, the `/api/cron/sequence-processor` cron (every 15 min on Vercel) will start actually sending sequence emails. Existing enrollments resume from `next_send_at`. If you want to throttle initial volume while DMARC reports come in, set `SEQUENCE_FROM_EMAIL` to a different verified address you can monitor separately.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Row stays `queued` forever | `sendEmail()` threw before reaching the UPDATE — check Vercel logs for the function |
| Row marked `failed` / `failure_reason='resend_not_configured'` | `RESEND_API_KEY` missing or wrong env |
| Row marked `failed` / `failure_reason='domain not verified'` | DNS still not green in Resend |
| `delivered_at` never sets | Webhook not configured or wrong signing secret — visit `/api/webhooks/resend` returns 401 on bad sig, 400 on missing headers |
| Goes to spam | Set up DMARC properly (step 2), warm the domain with low volume first, ensure `replyTo` is on the same domain |

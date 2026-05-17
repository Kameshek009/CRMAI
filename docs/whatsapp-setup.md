# WhatsApp Cloud API setup

Nexxus supports two onboarding modes. Pick the one that matches where you are in
your Meta Business Verification journey.

| Mode | Customer experience | Your prereq | When to use |
| --- | --- | --- | --- |
| **BYO** (Bring-your-own-app) | Customer creates a Meta Developer App, copies tokens into the integrations UI | None | Default. Works today. |
| **Embedded Signup** | Customer clicks "Connect via Meta", Meta provisions the phone+token | Meta Business Verification + Tech Provider status approved | Once Meta approves you, flip env vars on and the BYO panel becomes a backup. |

Both modes share the same runtime: signed Meta webhooks, encrypted access tokens,
and the same `whatsapp_messages` schema.

---

## A. BYO setup (customer-facing)

A workspace owner walks through this once per workspace.

### 1. Meta App
1. Open https://developers.facebook.com/apps and create a new **Business** app.
2. Add the **WhatsApp** product.
3. Under **WhatsApp → API Setup** copy the **Phone number ID** and the
   **WhatsApp Business Account ID** (WABA).
4. Under **App Settings → Basic** copy the **App Secret** (you'll click *Show*).
5. Generate a **Permanent token** via **Business Settings → System Users →
   `<your system user>` → Generate Token**, granting `whatsapp_business_messaging`
   and `whatsapp_business_management`.

### 2. Nexxus integrations panel
1. Go to `https://<your-app>/dashboard/account?tab=integrations`.
2. Open the WhatsApp Business card and fill:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token (the permanent token)
   - **App Secret** (new field — required for webhook signature verification)
3. Save. Nexxus auto-generates a webhook verify token (shown read-only).
4. Click **Test Connection** — should display your verified business name.

### 3. Configure webhook in Meta
1. Back in Meta App Dashboard → **WhatsApp → Configuration → Webhook**.
2. Callback URL: `https://<your-app>/api/webhooks/whatsapp`
3. Verify Token: paste the value from step 2.3.
4. Click **Verify and Save**.
5. Subscribe to webhook fields: **messages**, **message_template_status_update**.

You're done. Inbound messages will land on the contact timeline; outbound sends
flow through `/api/crm/whatsapp/send`.

### Common BYO pitfalls
- **Webhook fails Verify** — the Verify Token shown in Nexxus must match exactly.
  If you lost it, save settings again to surface a fresh one.
- **Invalid signature 401s** — the App Secret in Nexxus must match the App Secret
  in Meta App Dashboard. Re-save if you regenerated.
- **`Permission denied`** when sending — your access token is missing
  `whatsapp_business_messaging`. Regenerate from System Users.
- **`Re-save WhatsApp settings`** error — the workspace was migrated from the
  pre-encryption schema. Open settings, paste the access token again, save.

---

## B. Embedded Signup setup (you, the operator)

This requires Meta Business Verification and Tech Provider approval, which can
take 1–3 weeks. Until it's done, leave the env vars unset; the BYO path keeps
working and the "Connect via Meta" button stays disabled.

### 1. Meta Business Verification (one-time)
1. Open https://business.facebook.com/settings/info and request **Business
   Verification**. Meta will ask for:
   - Legal business name + registered address
   - Phone number reachable by Meta
   - Domain ownership of `<your-app>`
   - Optional: D-U-N-S number for faster review.
2. Verification typically takes 3–10 business days.

### 2. Tech Provider onboarding
1. Once verified, apply to be a **WhatsApp Business Solution Provider** via
   https://business.facebook.com/business-solution-providers (your account
   manager / partner page).
2. Get added as a **Tech Provider** to the WhatsApp Business Platform.
3. Provision an **Embedded Signup config_id** in Meta Business Solutions
   Partner UI for the "WhatsApp Business Account" feature.

### 3. App Review
1. In Meta App Dashboard → **App Review**, request approval for:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
2. Submit walkthrough video showing the OAuth flow from your site.

### 4. Env vars
```
WHATSAPP_META_APP_ID=<your Meta App ID>
WHATSAPP_META_APP_SECRET=<your Meta App Secret>
WHATSAPP_META_CONFIG_ID=<embedded signup config_id>
WHATSAPP_APP_SECRET=<same as WHATSAPP_META_APP_SECRET — used by the webhook>
```

Deploy. The "Connect via Meta" button in the integrations panel becomes enabled.

### 5. Customer flow
1. Customer clicks **Connect via Meta** in `/dashboard/account?tab=integrations`.
2. They're redirected to Meta's Embedded Signup dialog.
3. They authorise Nexxus on their Meta Business Account.
4. They pick a phone number (or provision a new one with Meta).
5. We exchange the OAuth `code` for an access token, store it encrypted, and
   bring them back with a connected badge.

After Embedded Signup, the customer doesn't need to deal with App Secrets,
permanent tokens, or webhook config — all of that is handled by the shared Meta
App we own.

---

## C. Webhook security

Every inbound webhook from Meta is verified via SHA-256 HMAC against the App
Secret. We resolve the right secret as follows:

1. Resolve the `phone_number_id` from the payload (`entry[].changes[].value.metadata.phone_number_id`).
2. Look up `whatsapp_settings.app_secret_encrypted` for the matching team.
3. If null and the team's `origin = 'embedded_signup'`, fall back to env
   `WHATSAPP_APP_SECRET` (Meta App we own).
4. HMAC-SHA256 the raw body with that secret, compare against
   `X-Hub-Signature-256: sha256=<hex>` using constant-time equality.

Reject (401) if the signature is missing or doesn't match. We never trust an
unsigned payload, even if `whatsapp_webhook_events` idempotency would otherwise
absorb the duplicate.

## D. Token storage

`whatsapp_settings.access_token_encrypted` and `.app_secret_encrypted` use the
same AES-256-GCM encryption as `oauth_tokens` (via `TOKEN_ENCRYPTION_KEY`). To
rotate the key, decrypt all rows with the old key, re-encrypt with the new key,
then redeploy. There is no automated rotation path yet — it's an operator-driven
ritual.

## E. Migration from legacy plaintext

Pre-migration-059 workspaces had their access tokens stored as plaintext in
`teams.settings.whatsapp.access_token`. Migration 059 backfilled rows into
`whatsapp_settings` with the sentinel prefix `MIGRATION_PLAINTEXT:` on the
encrypted column.

Until the workspace owner re-saves settings:
- `/api/crm/whatsapp/{send,templates,test-connection}` returns 400 with a
  "re-save" message.
- The webhook still routes incoming messages by `phone_number_id` but cannot
  decrypt the access token to mark-as-read — that's a degraded-but-functional
  state.
- The integrations UI surfaces an amber banner.

After re-save, the row carries a real AES-256-GCM ciphertext and behaviour is
normal.

# Inbox / Calendar setup — Google (Gmail + Calendar)

This guide walks through the external GCP work needed for the Phase 1
Inbox/Calendar feature. Outlook is intentionally out of scope for the first
shipment.

Estimated time: **45–75 minutes** for a brand-new GCP project.

You only need to do this once per Nexxus deployment (production, staging,
local-dev each need their own OAuth client / Pub/Sub).

---

## 0. Prerequisites

- A Google account with billing enabled (Pub/Sub is in the free tier for our
  volumes but GCP still requires a billing account).
- Your deployed Nexxus `NEXT_PUBLIC_APP_URL`, e.g. `https://app.nexxus.example`.
- Shell access to add env vars to your hosting (Vercel / `.env`).

---

## 1. Create / select a GCP project

1. Open https://console.cloud.google.com.
2. Top bar → project selector → **NEW PROJECT** → name it `nexxus-inbox`
   (any name is fine).
3. Wait for the project to provision, then make sure it is selected.

## 2. Enable APIs

In **APIs & Services → Library**, search for and **Enable**:

- **Gmail API**
- **Google Calendar API**
- **Cloud Pub/Sub API** (Stage 2 — required for inbox push notifications)

## 3. OAuth consent screen

**APIs & Services → OAuth consent screen**:

- User type: **External** (so any Google account can connect — your customers
  use their own Workspace).
- App information:
  - App name: `Nexxus`
  - User support email: yours
  - App logo: optional
- App domain:
  - Application home page: `https://<your-app>`
  - Privacy policy: `https://<your-app>/privacy`
  - Terms of service: `https://<your-app>/terms`
- Authorized domains: the apex domain of `NEXT_PUBLIC_APP_URL` (e.g.
  `nexxus.example`).
- Developer contact: yours.
- **Scopes** — click **Add or remove scopes** and select:
  - `openid` (under "OpenID Connect")
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.metadata`
  - `https://www.googleapis.com/auth/calendar.events`
- Test users: add the Google account(s) you'll use to QA. (You can stay in
  "Testing" mode indefinitely; "Production" requires Google's verification.)

## 4. OAuth 2.0 Client ID

**APIs & Services → Credentials → Create credentials → OAuth client ID**:

- Application type: **Web application**
- Name: `Nexxus Web`
- Authorized redirect URIs (add exactly):
  - `https://<your-app>/api/oauth/google/callback`
  - `http://localhost:3000/api/oauth/google/callback` (local dev — optional)

Click **Create** and copy:

- **Client ID** → set as env `GOOGLE_OAUTH_CLIENT_ID`
- **Client secret** → set as env `GOOGLE_OAUTH_CLIENT_SECRET`

Also generate a 32-byte AES key for `TOKEN_ENCRYPTION_KEY` (encrypts the
stored access/refresh tokens at rest):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set `TOKEN_ENCRYPTION_KEY=<output>`. This must be **stable** across deploys
— if you rotate it, all existing oauth_tokens become unreadable and users
must reconnect.

Deploy or restart. The Integrations card at
`/dashboard/account?tab=integrations` should now show **Connect Google**
enabled. Sign in with a test user from step 3, consent to the scopes, and
verify the card switches to **Connected** with the test user's email.

---

## 5. Pub/Sub topic + subscription (Stage 2)

> Required for Gmail inbox sync. Skip if you only need Calendar (Stage 4)
> for now — Calendar can poll instead, but Gmail watch is push-only.

### 5.1 Create the topic

**Pub/Sub → Topics → Create topic**:

- Topic ID: `gmail-inbox-events`
- Encryption: Google-managed.
- Add a default subscription: **NO** (we'll create it explicitly).

### 5.2 Grant Gmail permission to publish

On the new topic page → **Permissions → Grant access**:

- New principals: `gmail-api-push@system.gserviceaccount.com`
- Role: `Pub/Sub Publisher`
- Save.

This is the published-by-Google service account. Without this grant, every
`watch()` call will succeed but no notifications will fire.

### 5.3 Create a push subscription

**Pub/Sub → Subscriptions → Create subscription**:

- ID: `gmail-inbox-events-push`
- Topic: `gmail-inbox-events`
- Delivery type: **Push**
- Endpoint URL: `https://<your-app>/api/webhooks/google/gmail`
- Enable authentication: **YES**
  - Service account: pick (or create) one, e.g. `pubsub-pusher@<project>.iam.gserviceaccount.com`
  - Audience: `https://<your-app>/api/webhooks/google/gmail`
- Acknowledgement deadline: 60s (Pub/Sub default).
- Message retention: 24 hours.

The push will arrive with `Authorization: Bearer <JWT>` issued by Google. Our
webhook (Stage 2 code) verifies that JWT against Google's public keys.

### 5.4 Env vars for Stage 2

After Stage 2 ships, add:

```
GOOGLE_PUBSUB_TOPIC=projects/<your-project>/topics/gmail-inbox-events
GOOGLE_PUBSUB_AUDIENCE=https://<your-app>/api/webhooks/google/gmail
```

---

## 6. Local development

Pub/Sub doesn't deliver to `localhost`. Two options:

- Skip Stage 2 push setup locally; rely on staging for end-to-end.
- Use a tunnel (`ngrok`, `cloudflared`) to expose `localhost:3000` and point
  the push subscription at the tunnel URL.

OAuth itself (Stage 1) works fine with `http://localhost:3000` because the
authorize → callback dance is a browser redirect, not a server-to-server push.

---

## 7. Verification checklist

- [ ] `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
      `TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL` set in production
- [ ] OAuth consent screen lists all six scopes
- [ ] Redirect URI registered exactly (`https://<app>/api/oauth/google/callback`)
- [ ] Test user signs in via `/dashboard/account?tab=integrations`, sees
      Connected state with their email
- [ ] `oauth_tokens` row exists in DB for `(team_id, provider='google',
      provider_user_id=<sub>)`
- [ ] (Stage 2) `gmail-api-push@system.gserviceaccount.com` has Pub/Sub
      Publisher on the topic
- [ ] (Stage 2) Push subscription endpoint is HTTPS with audience matching
      the webhook URL

---

## 8. Troubleshooting

- **`redirect_uri_mismatch`** at consent — the redirect URI in Cloud Console
  must match `NEXT_PUBLIC_APP_URL/api/oauth/google/callback` byte-for-byte,
  including scheme and trailing slash absence.
- **`access_denied`** at consent — the test user isn't in the OAuth screen's
  Test users list (in Testing mode).
- **State mismatch** in callback — cookies are blocked by third-party cookie
  settings or the user took >10 minutes on Google's consent screen. Retry.
- **`invalid_grant` on refresh** — the user revoked access (Google
  Account → Security → Third-party access), or the refresh_token was
  invalidated. Users need to reconnect.
- **No push notifications arriving** (Stage 2) — verify the
  `gmail-api-push@system.gserviceaccount.com` permission and that the push
  subscription's audience exactly matches the webhook URL.

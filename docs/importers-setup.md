# API importers — setup

Live (OAuth-based) imports for HubSpot and amoCRM/Kommo. The customer
clicks **Connect** in `/dashboard/contacts → Live CRM import`, authorises
via the provider's OAuth dialog, then **Import now** pulls contacts,
companies, and deals into Nexxus.

Bitrix24 and Salesforce are listed in the UI but not wired yet — they'll
arrive in a follow-up.

---

## 1. HubSpot

### a) Register a Public App
1. https://developers.hubspot.com → Apps → **Create a public app**.
2. Auth tab → set redirect URL: `https://nexxuscrm.com/api/oauth/importers/hubspot/callback`.
3. Scopes:
   - `oauth`
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
4. Copy **Client ID** and **Client secret**.

### b) Env vars
```
HUBSPOT_OAUTH_CLIENT_ID=<client id>
HUBSPOT_OAUTH_CLIENT_SECRET=<client secret>
```

Deploy. The Connect HubSpot button activates in `/dashboard/contacts`.

### c) What gets imported
| HubSpot | Nexxus |
| --- | --- |
| Contact | contacts (`email` dedup) |
| Company | companies (`domain` dedup) |
| Deal | deals (no dedup, `metadata.hubspot_id` for re-import) |

Custom properties land in the target row's `metadata` field, prefixed
with `hubspot_`. `Deal.dealstage` is preserved as-is in metadata — the
user maps it to a Nexxus pipeline stage manually post-import.

---

## 2. amoCRM / Kommo

### a) Register an Integration
1. amoCRM/Kommo account → **Settings → Integrations → Develop your own**.
2. Create integration. Redirect URI: `https://nexxuscrm.com/api/oauth/importers/amocrm/callback`.
3. Permissions: at minimum **Read access** to *contacts, leads, companies*.
4. Allow the integration to be installed on **any account** (so multiple Nexxus tenants can connect their own amoCRM).
5. Copy **Integration ID** and **Secret key**.

### b) Env vars
```
AMOCRM_INTEGRATION_ID=<integration id>
AMOCRM_SECRET_KEY=<secret key>
```

Deploy. The Connect amoCRM button activates.

### c) Naming note
amoCRM "Leads" = Nexxus "Deals" (sales opportunities). We do **not** import
amoCRM Leads into Nexxus `leads` (early-stage prospects). amoCRM Contacts
go into Nexxus `contacts`.

### d) Subdomain handling
amoCRM's OAuth callback delivers a `referer=<subdomain>.amocrm.ru` query
param. We validate it against `[a-z0-9-]+\.(amocrm\.ru|amocrm\.com|kommo\.com)`
to prevent code exchange against an attacker-controlled host. The subdomain
is then stored in `oauth_tokens.metadata.subdomain` and used as the API
base for all subsequent requests.

---

## 3. Operational notes

### Vercel runtime cap
The import runner executes inside the Vercel function that handles
`/api/crm/import/<provider>/run`. On **Pro** that's 60 seconds. On
**Hobby** it's ~10 seconds, which will only get through ~1000 contacts
in practice; large imports will be marked `failed` mid-flight. UI surfaces
this; users on Hobby should consider upgrading or doing CSV exports.

### Polling
The UI polls `/api/crm/import/jobs/:id` every 2 seconds until terminal
state. The `crm_imports` row holds `total_records`, `imported_records`,
`skipped_records`, `error_count`, plus the latest 100 error messages.

### Dedup strategy
For each provider/upstream pair:
1. **Natural key** (email for contacts, domain for companies) — UPDATE if a
   row already exists in the workspace.
2. **Upstream id** in `metadata.import_upstream_id` — UPDATE on re-import.
3. Otherwise INSERT.

This means re-running an import is safe: it'll refresh existing rows
rather than duplicate them.

### Token refresh
HubSpot tokens expire in ~6h, amoCRM in 24h. `getValidAccessToken()`
auto-refreshes via the provider's refresh_token flow. On refresh failure
(user revoked access on provider side), the next import attempt surfaces
an error and the workspace owner has to reconnect.

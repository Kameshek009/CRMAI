# Serotonin Dashboard - Architecture Documentation

> Control center and billing gateway for the Serotonin AI Desktop Agent

---

## Overview

The Serotonin Dashboard is a **Next.js web application** that provides:
- User authentication via Clerk OAuth
- Subscription management and billing via Stripe
- Token usage tracking and session history
- Real-time statistics API for the desktop app
- Monthly billing cycle management

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.0.8 (React 19) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| Auth | Clerk (@clerk/nextjs) |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe |
| UI Components | HeroUI, Lucide Icons |

---

## Database Schema

### Tables

#### `accounts`
Core user account table linked to Clerk users.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `clerk_user_id` | string | Links to Clerk user |
| `tier` | enum | "free" \| "pro" \| "enterprise" |
| `token_limit` | number | Monthly token allowance |
| `tokens_used` | number | Tokens consumed this cycle |
| `billing_cycle_start` | timestamp | Current billing period start |
| `stripe_customer_id` | string? | Stripe customer reference |
| `stripe_subscription_id` | string? | Active subscription ID |

#### `sessions`
Tracks desktop agent sessions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to accounts |
| `started_at` | timestamp | Session start time |
| `ended_at` | timestamp? | Session end time |
| `tokens_used` | number | Tokens consumed in session |
| `status` | enum | "active" \| "completed" \| "error" |
| `summary` | string? | Session description |

#### `usage_records`
Granular token usage tracking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to accounts |
| `session_id` | UUID? | Optional session link |
| `tokens_consumed` | number | Tokens used |
| `action_type` | string | Type of action performed |
| `metadata` | JSON | Custom data |

#### `activity_logs`
Event log for all user actions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `account_id` | UUID | Foreign key to accounts |
| `session_id` | UUID? | Optional session link |
| `event_type` | enum | "session_start" \| "session_end" \| "action_executed" \| "error" \| "warning" \| "info" |
| `message` | string | Human-readable description |
| `metadata` | JSON | Custom data |

---

## Subscription Tiers

| Tier | Price | Tokens/Month | Features |
|------|-------|--------------|----------|
| **Free** | $0 | 10,000 | Basic automation, 7-day history |
| **Pro** | $20 | 100,000 | Priority support, 30-day history, API access |
| **Enterprise** | $100 | 1,000,000 | Dedicated support, unlimited history, custom integrations |

---

## API Endpoints

### Authentication

#### `POST /api/auth/verify`
Verify JWT token and get/create account.

**Auth:** Clerk session or Bearer token

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "clerk_user_id",
    "account": {
      "id": "uuid",
      "tier": "free",
      "token_limit": 10000,
      "tokens_used": 0
    }
  }
}
```

---

### Session Management

#### `POST /api/sessions/start`
Initialize new agent session.

**Auth:** Bearer token required

**Request:**
```json
{
  "summary": "Optional session description",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "active",
    "startedAt": "ISO8601",
    "tokensAvailable": 10000
  }
}
```

#### `POST /api/sessions/end`
Conclude active session.

**Request:**
```json
{
  "sessionId": "uuid",
  "status": "completed",
  "summary": "Optional completion summary"
}
```

---

### Usage Tracking

#### `POST /api/usage/record`
Record token consumption.

**Request:**
```json
{
  "tokensConsumed": 100,
  "actionType": "api_call",
  "sessionId": "optional-uuid",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokensUsed": 100,
    "tokenLimit": 10000,
    "tokensRemaining": 9900
  }
}
```

**Error (429):** Token limit reached

#### `GET /api/usage/current`
Get current usage stats.

**Response:**
```json
{
  "success": true,
  "data": {
    "tokensUsed": 150,
    "tokenLimit": 10000,
    "percentUsed": 2,
    "daysRemaining": 19,
    "tier": "free"
  }
}
```

#### `GET /api/usage/history`
Get detailed usage history.

**Query Params:** `limit`, `offset`, `days`

---

### Activity Logging

#### `POST /api/activity/log`
Log activity events.

**Request:**
```json
{
  "eventType": "session_start",
  "message": "Session started",
  "sessionId": "optional-uuid",
  "metadata": {}
}
```

#### `GET /api/activity/log`
Retrieve activity logs.

**Query Params:** `limit`, `offset`, `sessionId`, `eventType`

---

### Billing

#### `POST /api/billing/portal`
Create Stripe billing portal session.

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/session/..."
  }
}
```

#### `POST /api/billing/webhook`
Handle Stripe webhook events. (Public route - signature verified)

**Events Handled:**
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan change
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Monthly reset
- `invoice.payment_failed` - Payment error

---

## Desktop App Integration

### Authentication Flow

```
Desktop App
    |
    v (Opens browser)
Sign-in Page (Clerk)
    |
    v (OAuth flow)
Redirect to /dashboard
    |
    v (Get JWT from Clerk SDK)
Store JWT locally
    |
    v (Include in requests)
Authorization: Bearer {jwt}
```

### Session Flow

```
1. POST /api/auth/verify
   -> Get account info + token limits

2. POST /api/sessions/start
   -> Get sessionId + tokensAvailable

3. [Run automation tasks]
   -> POST /api/usage/record (multiple times)
   -> Track remaining tokens

4. POST /api/sessions/end
   -> Log session completion
```

### Request Headers

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Token expired | Re-authenticate |
| 429 | Token limit reached | Wait for billing cycle or upgrade |
| 400 | Invalid request | Check request format |
| 500 | Server error | Retry or contact support |

---

## Data Flow Diagrams

### Token Usage Cycle

```
[Desktop App]
       |
       v
[Session Start] --> Check token_limit vs tokens_used
       |
       v
[Run Action] --> POST /api/usage/record
       |            |
       |            v
       |        Validate: new_total <= token_limit
       |            |
       |            v
       |        Insert usage_record
       |            |
       |            v
       |        Update account.tokens_used
       |
       v
[Session End] --> Calculate duration & summary
       |
       v
[Activity Log] --> Record all events
       |
       v
[Dashboard] --> Display real-time stats
```

### Billing Cycle

```
[User Subscribes] --> Stripe Checkout
       |
       v
[Webhook: checkout.session.completed]
       |
       +--> Update account.tier
       +--> Set token_limit per tier
       +--> Set billing_cycle_start
       |
       v
[Monthly: invoice.payment_succeeded]
       |
       +--> Reset tokens_used = 0
       +--> Update billing_cycle_start
       |
       v
[New Month] --> Fresh token allocation
```

---

## Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stripe Billing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/verify/route.ts
│   │   ├── sessions/start/route.ts
│   │   ├── sessions/end/route.ts
│   │   ├── usage/record/route.ts
│   │   ├── usage/current/route.ts
│   │   ├── usage/history/route.ts
│   │   ├── activity/log/route.ts
│   │   └── billing/
│   │       ├── portal/route.ts
│   │       └── webhook/route.ts
│   ├── (protected)/dashboard/
│   │   ├── page.tsx (Overview)
│   │   ├── account/page.tsx (Settings)
│   │   ├── account/billing/page.tsx
│   │   ├── usage/page.tsx
│   │   ├── sessions/page.tsx
│   │   ├── activity/page.tsx
│   │   └── console/page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   └── page-container.tsx
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── admin.ts
│   │   └── types.ts
│   └── utils.ts
└── middleware.ts
```

---

## Security

### Authentication
- Clerk handles OAuth/password management
- JWT tokens signed and verified by Clerk
- Middleware enforces auth on protected routes

### Database
- Supabase service role used only in API routes
- Row-Level Security (RLS) policies enforce ownership
- Queries filtered by `account_id`

### Billing
- Stripe webhook signature verification
- Payment data never touches backend
- Only Stripe can trigger billing updates

### Token Limits
- Validated before allowing actions
- Atomically updated to prevent race conditions
- Reset only on successful Stripe payment

---

## TypeScript Interfaces

```typescript
interface Account {
  id: string;
  clerkUserId: string;
  tier: "free" | "pro" | "enterprise";
  tokenLimit: number;
  tokensUsed: number;
  billingCycleStart: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface AgentSession {
  id: string;
  accountId: string;
  startedAt: Date;
  endedAt: Date | null;
  tokensUsed: number;
  status: "active" | "completed" | "error";
  summary: string | null;
}

interface UsageRecord {
  id: string;
  accountId: string;
  tokensConsumed: number;
  actionType: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface ActivityLog {
  id: string;
  accountId: string;
  sessionId: string | null;
  eventType: "session_start" | "session_end" | "action_executed" | "error" | "warning" | "info";
  message: string;
  metadata: Record<string, unknown>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Quick Start for Desktop App Integration

1. **Install Clerk SDK** in desktop app
2. **Implement sign-in flow** using Clerk's embedded browser
3. **Store JWT** securely after authentication
4. **Call `/api/auth/verify`** on app startup to get account info
5. **Start sessions** with `/api/sessions/start` before automation
6. **Record usage** with `/api/usage/record` for each action
7. **End sessions** with `/api/sessions/end` when done
8. **Handle 429 errors** gracefully (show upgrade prompt)

---

## Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Type checking
npx tsc --noEmit
```

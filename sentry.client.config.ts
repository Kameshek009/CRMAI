// Client-side Sentry is gated by analytics consent so we don't drop a
// session-replay cookie before the user has agreed to it. Wrap any future
// re-enable like the commented block below — never call Sentry.init() at the
// module top level.

// import * as Sentry from "@sentry/nextjs";
// import { hasAnalyticsConsent } from "@/lib/gdpr/consent";
//
// if (typeof window !== "undefined" && hasAnalyticsConsent()) {
//   Sentry.init({
//     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//     enabled: process.env.NODE_ENV === "production",
//     tracesSampleRate: 0.1,
//     replaysSessionSampleRate: 0,
//     replaysOnErrorSampleRate: 1.0,
//     integrations: [Sentry.replayIntegration()],
//   });
// }

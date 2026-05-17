// Shared GDPR configuration. Kept in code rather than a migration so we can
// tune the grace period without ALTERing accounts.

export const DELETION_GRACE_DAYS = 30;
export const DELETION_GRACE_MS = DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_NAME = "nexxus_consent";
export const COOKIE_CONSENT_MAX_AGE = 365 * 24 * 60 * 60;

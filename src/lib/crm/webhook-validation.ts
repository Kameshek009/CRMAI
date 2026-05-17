import { z } from "zod";

/**
 * Validation schemas + SSRF guard for webhook_endpoints admin CRUD.
 *
 * SSRF protection (level 1): URL must be `https:`, hostname must not point
 * at a private/loopback/link-local range. Level 2 (DNS rebinding via
 * resolve + reject if any A record is private) is deferred — admin-only
 * surface with `team_settings:manage` is acceptable risk for now.
 */

const EVENT_TYPE_PATTERN = /^\*$|^[a-z][a-z0-9_]*(\.([a-z][a-z0-9_]*|\*))*$/;

// Hostname denylist (case-insensitive). Checked against `URL.hostname`, which
// normalises 0x7f000001/0177.0.0.1/etc. to the dotted-quad form.
const LOOPBACK_HOSTS = new Set(["localhost", "0.0.0.0", "::", "::1", "[::1]", "[::]"]);

const PRIVATE_IPV4 = [
  /^127\./,                                                    // loopback
  /^10\./,                                                     // RFC1918
  /^192\.168\./,                                               // RFC1918
  /^172\.(1[6-9]|2\d|3[0-1])\./,                               // 172.16/12
  /^169\.254\./,                                               // link-local (incl. AWS metadata 169.254.169.254)
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,                 // CGNAT 100.64/10
  /^0\./,                                                      // "this network"
];

function isPrivateIPv6(host: string): boolean {
  // Strip brackets, lowercase.
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 ULA
  if (h.startsWith("fe80:") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) return true; // fe80::/10 link-local
  return false;
}

export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host)) return false;
  if (host.includes(":")) return !isPrivateIPv6(host);
  for (const rx of PRIVATE_IPV4) if (rx.test(host)) return false;
  return true;
}

const eventTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(EVENT_TYPE_PATTERN, "Invalid event type");

export const createWebhookSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .refine(isSafeWebhookUrl, "URL must be https and point to a public host"),
  event_types: z.array(eventTypeSchema).min(1).max(50).default(["*"]),
});

export const updateWebhookSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    url: z
      .string()
      .trim()
      .url("Must be a valid URL")
      .refine(isSafeWebhookUrl, "URL must be https and point to a public host")
      .optional(),
    event_types: z.array(eventTypeSchema).min(1).max(50).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

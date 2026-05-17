/**
 * Match an inbound email's `From:` address against the workspace's contacts
 * and leads. Returns the best match or `null` if none found.
 *
 * Normalisation rules:
 *   - lowercase
 *   - strip plus-addressing (`foo+bar@x.com` → `foo@x.com`)
 *   - strip surrounding whitespace
 *
 * We deliberately do NOT match against companies, accounts, or webform
 * captures — only "person-ish" records (contacts, leads).
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";

export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const plus = local.indexOf("+");
  const baseLocal = plus < 0 ? local : local.slice(0, plus);
  return `${baseLocal}@${domain}`;
}

/**
 * Parse the value of a `From:` header into a bare email. Supports the
 * RFC-style `Display Name <addr@host>` form and the bare `addr@host` form.
 */
export function parseFromHeader(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  if (m && m[1]) return m[1].trim();
  return raw.trim();
}

export interface MatchedContact {
  kind: "contact" | "lead";
  id: string;
  email: string;
}

/**
 * Looks up the address against contacts then leads in the given workspace.
 * Returns the first match; ties (same email on a contact and a lead) prefer
 * the contact because that's the more durable record.
 */
export async function matchEmailToRecord(
  teamId: string,
  rawEmail: string,
): Promise<MatchedContact | null> {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized.includes("@")) return null;
  const supabase = createSupabaseAdmin();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("team_id", teamId)
    .eq("is_deleted", false)
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();
  if (contact?.id) return { kind: "contact", id: contact.id, email: contact.email };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, email")
    .eq("team_id", teamId)
    .eq("is_deleted", false)
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();
  if (lead?.id) return { kind: "lead", id: lead.id, email: lead.email };

  return null;
}

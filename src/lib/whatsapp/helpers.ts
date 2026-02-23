import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { WhatsAppConfig } from "./client";

interface WhatsAppSettings {
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  webhook_verify_token: string;
  is_connected?: boolean;
}

/**
 * Load WhatsApp config from team settings JSONB.
 * Returns null if not configured.
 */
export async function getWhatsAppConfig(teamId: string): Promise<(WhatsAppConfig & { webhookVerifyToken: string }) | null> {
  const supabase = createSupabaseAdmin();
  const { data: team } = await supabase
    .from("teams")
    .select("settings")
    .eq("id", teamId)
    .single();

  const settings = team?.settings as Record<string, unknown> | null;
  const wa = settings?.whatsapp as WhatsAppSettings | undefined;

  if (!wa?.phone_number_id || !wa?.access_token) return null;

  return {
    phoneNumberId: wa.phone_number_id,
    accessToken: wa.access_token,
    wabaId: wa.waba_id,
    webhookVerifyToken: wa.webhook_verify_token,
  };
}

/**
 * Find team by WhatsApp phone_number_id stored in settings.
 * Used by the webhook to route incoming messages.
 */
export async function findTeamByPhoneNumberId(phoneNumberId: string): Promise<{ teamId: string; accountId: string; webhookVerifyToken: string } | null> {
  const supabase = createSupabaseAdmin();

  // Search for team where settings->'whatsapp'->>'phone_number_id' matches
  const { data: teams } = await supabase
    .from("teams")
    .select("id, owner_account_id, settings")
    .is("deleted_at", null);

  if (!teams) return null;

  for (const team of teams) {
    const settings = team.settings as Record<string, unknown> | null;
    const wa = settings?.whatsapp as WhatsAppSettings | undefined;
    if (wa?.phone_number_id === phoneNumberId) {
      return {
        teamId: team.id,
        accountId: team.owner_account_id,
        webhookVerifyToken: wa.webhook_verify_token,
      };
    }
  }

  return null;
}

/**
 * Try to match a phone number to an existing contact.
 * Strips common formatting to do a loose match.
 */
export async function findContactByPhone(teamId: string, phone: string): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  // Normalize: strip non-digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;

  // Try exact match with common formats
  const variants = [
    phone,              // original
    `+${digits}`,       // +7999...
    digits,             // 7999...
  ];

  for (const variant of variants) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .eq("phone", variant)
      .limit(1)
      .maybeSingle();

    if (data?.id) return data.id;
  }

  // Fallback: suffix match on last 10 digits (parameterized)
  const suffix = digits.slice(-10);
  const { data: fallback } = await supabase
    .from("contacts")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_deleted", false)
    .ilike("phone", `%${suffix}`)
    .limit(1)
    .maybeSingle();

  return fallback?.id || null;
}

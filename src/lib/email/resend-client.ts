import { Resend } from "resend";

/**
 * Lazy Resend client.
 *
 * Returns null when RESEND_API_KEY is not configured. Callers must treat that
 * as "send is unavailable" rather than crash — sequence-processor and the
 * /api/crm/emails route both run in environments (dev/CI) where outbound mail
 * is intentionally disabled.
 */
let cached: Resend | null | undefined;

export function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

/** @internal — tests can reset cached client after manipulating env */
export function __resetResendClientCache(): void {
  cached = undefined;
}

export interface SendViaResendInput {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

export type SendViaResendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export async function sendViaResend(input: SendViaResendInput): Promise<SendViaResendResult> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "resend_not_configured" };
  if (!input.html && !input.text) return { ok: false, error: "empty_body" };

  // Resend's send() takes a discriminated union requiring exactly one of
  // html/text/react/template. Build the payload without undefined fields so
  // the discrimination works at the type-system level.
  type SendArg = Parameters<Resend["emails"]["send"]>[0];
  const payload = {
    from: input.from,
    to: input.to,
    subject: input.subject,
    ...(input.html ? { html: input.html } : {}),
    ...(input.text ? { text: input.text } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  } as SendArg;

  try {
    const res = await resend.emails.send(payload);

    if (res.error) {
      return { ok: false, error: res.error.message ?? "resend_error" };
    }
    if (!res.data?.id) return { ok: false, error: "no_message_id" };
    return { ok: true, providerMessageId: res.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "resend_exception" };
  }
}

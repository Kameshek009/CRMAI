/**
 * Bitrix24 → MappedRow. Bitrix uses ALL_CAPS property names and stores
 * email/phone as arrays of `{VALUE, VALUE_TYPE}`. We take the first entry
 * of each and lowercase emails.
 *
 * Bitrix has both *leads* (early-stage) and *deals* (sales-stage), which
 * matches our schema cleanly: leads → leads, deals → deals.
 */

import type { MappedRow } from "../types";
import type {
  Bitrix24Company,
  Bitrix24Contact,
  Bitrix24Deal,
  Bitrix24Lead,
} from "./client";

function firstValue(arr: Array<{ VALUE?: string }> | undefined): string | null {
  if (!arr || arr.length === 0) return null;
  return arr[0]?.VALUE?.trim() || null;
}

function fullName(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).map((p) => p!.trim()).filter(Boolean).join(" ").trim();
}

export function mapBitrix24Lead(l: Bitrix24Lead): MappedRow {
  const email = firstValue(l.EMAIL)?.toLowerCase() ?? null;
  const phone = firstValue(l.PHONE);
  const fname = (l.NAME ?? "").trim();
  const lname = (l.LAST_NAME ?? "").trim();
  const title = (l.TITLE ?? fullName([fname, lname])).trim();

  return {
    entity: "leads",
    upstreamId: String(l.ID),
    row: {
      first_name: fname || (email ? email.split("@")[0] : title || "Unknown"),
      last_name: lname || null,
      email,
      phone,
      organization: l.COMPANY_TITLE?.trim() || null,
      source: "bitrix24",
      status: mapLeadStatus(l.STATUS_ID),
      metadata: {
        bitrix24_id: l.ID,
        bitrix24_status_id: l.STATUS_ID ?? null,
        bitrix24_source_id: l.SOURCE_ID ?? null,
        bitrix24_opportunity: l.OPPORTUNITY ?? null,
        bitrix24_currency: l.CURRENCY_ID ?? null,
        bitrix24_comments: l.COMMENTS ?? null,
        bitrix24_date_create: l.DATE_CREATE ?? null,
      },
    },
    dedupBy: email ? { column: "email", value: email } : undefined,
  };
}

function mapLeadStatus(status: string | undefined): string | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "NEW") return "new";
  if (s === "IN_PROCESS" || s === "PROCESSED") return "working";
  if (s === "CONVERTED") return "converted";
  if (s === "JUNK") return "disqualified";
  return null;
}

export function mapBitrix24Contact(c: Bitrix24Contact): MappedRow {
  const email = firstValue(c.EMAIL)?.toLowerCase() ?? null;
  const phone = firstValue(c.PHONE);
  return {
    entity: "contacts",
    upstreamId: String(c.ID),
    row: {
      first_name: (c.NAME ?? "").trim() || (email ? email.split("@")[0] : "Unknown"),
      last_name: c.LAST_NAME?.trim() || null,
      email,
      phone,
      title: c.POST?.trim() || null,
      source: "bitrix24",
      metadata: {
        bitrix24_id: c.ID,
        bitrix24_company_id: c.COMPANY_ID ?? null,
        bitrix24_second_name: c.SECOND_NAME ?? null,
        bitrix24_date_create: c.DATE_CREATE ?? null,
      },
    },
    dedupBy: email ? { column: "email", value: email } : undefined,
  };
}

export function mapBitrix24Company(c: Bitrix24Company): MappedRow {
  const phone = firstValue(c.PHONE);
  const website = firstValue(c.WEB);
  return {
    entity: "companies",
    upstreamId: String(c.ID),
    row: {
      name: c.TITLE?.trim() || "Untitled",
      industry: c.INDUSTRY?.trim() || null,
      phone,
      website,
      city: c.ADDRESS_CITY?.trim() || null,
      country: c.ADDRESS_COUNTRY?.trim() || null,
      description: c.COMMENTS?.trim() || null,
      metadata: {
        bitrix24_id: c.ID,
        bitrix24_date_create: c.DATE_CREATE ?? null,
      },
    },
  };
}

export function mapBitrix24Deal(d: Bitrix24Deal): MappedRow {
  const amount = d.OPPORTUNITY ? Number(d.OPPORTUNITY) : null;
  return {
    entity: "deals",
    upstreamId: String(d.ID),
    row: {
      title: d.TITLE?.trim() || "Untitled deal",
      amount: Number.isFinite(amount) ? amount : null,
      stage: "new",
      expected_close_date: d.CLOSEDATE ? d.CLOSEDATE.split("T")[0] : null,
      description: d.COMMENTS?.trim() || null,
      metadata: {
        bitrix24_id: d.ID,
        bitrix24_stage_id: d.STAGE_ID ?? null,
        bitrix24_category_id: d.CATEGORY_ID ?? null,
        bitrix24_currency: d.CURRENCY_ID ?? null,
        bitrix24_company_id: d.COMPANY_ID ?? null,
        bitrix24_contact_id: d.CONTACT_ID ?? null,
        bitrix24_date_create: d.DATE_CREATE ?? null,
      },
    },
  };
}

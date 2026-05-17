/**
 * AmoCRM objects → MappedRow.
 *
 * Naming note: AmoCRM "leads" = our deals (sales opportunities). AmoCRM
 * "contacts" = our contacts. AmoCRM "companies" = our companies. Custom
 * field handling: we extract EMAIL / PHONE / POSITION codes and put
 * everything else into metadata as-is for the user to inspect.
 */

import type { MappedRow } from "../types";
import type { AmoCRMCompany, AmoCRMContact, AmoCRMLead } from "./client";

type CustomField = NonNullable<AmoCRMContact["custom_fields_values"]>[number];

function findCustomField(fields: CustomField[] | undefined, codes: string[]): string | null {
  if (!fields) return null;
  for (const f of fields) {
    if (f.field_code && codes.includes(f.field_code.toUpperCase())) {
      const v = f.values?.[0]?.value;
      if (typeof v === "string") return v.trim() || null;
      if (typeof v === "number") return String(v);
    }
  }
  return null;
}

function splitName(full: string | undefined): { first: string; last: string | null } {
  if (!full) return { first: "Unknown", last: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0]!, last: null };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

export function mapAmoCRMContact(c: AmoCRMContact): MappedRow {
  const email = findCustomField(c.custom_fields_values, ["EMAIL"]);
  const phone = findCustomField(c.custom_fields_values, ["PHONE", "MOBILE", "WORK"]);
  const title = findCustomField(c.custom_fields_values, ["POSITION"]);

  const first = c.first_name?.trim();
  const last = c.last_name?.trim();
  const name = c.name?.trim();
  const split = first ? { first, last: last || null } : splitName(name);

  return {
    entity: "contacts",
    upstreamId: String(c.id),
    row: {
      first_name: split.first,
      last_name: split.last,
      email: email ? email.toLowerCase() : null,
      phone,
      title,
      source: "amocrm",
      metadata: {
        amocrm_id: c.id,
        amocrm_responsible_user_id: c.responsible_user_id ?? null,
        amocrm_created_at: c.created_at ? new Date(c.created_at * 1000).toISOString() : null,
        amocrm_companies: c._embedded?.companies?.map((co) => co.id) ?? [],
        amocrm_tags: c._embedded?.tags?.map((t) => t.name) ?? [],
      },
    },
    dedupBy: email ? { column: "email", value: email.toLowerCase() } : undefined,
  };
}

export function mapAmoCRMCompany(c: AmoCRMCompany): MappedRow {
  const phone = findCustomField(c.custom_fields_values, ["PHONE"]);
  const website = findCustomField(c.custom_fields_values, ["WEB"]);
  return {
    entity: "companies",
    upstreamId: String(c.id),
    row: {
      name: c.name?.trim() || "Untitled",
      phone,
      website,
      metadata: {
        amocrm_id: c.id,
        amocrm_created_at: c.created_at ? new Date(c.created_at * 1000).toISOString() : null,
      },
    },
  };
}

export function mapAmoCRMLead(l: AmoCRMLead): MappedRow {
  return {
    entity: "deals",
    upstreamId: String(l.id),
    row: {
      title: l.name?.trim() || "Untitled deal",
      amount: typeof l.price === "number" ? l.price : null,
      stage: "new",
      expected_close_date: null,
      metadata: {
        amocrm_id: l.id,
        amocrm_status_id: l.status_id,
        amocrm_pipeline_id: l.pipeline_id,
        amocrm_responsible_user_id: l.responsible_user_id ?? null,
        amocrm_created_at: l.created_at ? new Date(l.created_at * 1000).toISOString() : null,
        amocrm_closed_at: l.closed_at ? new Date(l.closed_at * 1000).toISOString() : null,
        amocrm_associated_contacts: l._embedded?.contacts?.map((c) => c.id) ?? [],
        amocrm_associated_companies: l._embedded?.companies?.map((c) => c.id) ?? [],
      },
    },
  };
}

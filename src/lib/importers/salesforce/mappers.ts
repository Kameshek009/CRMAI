/**
 * Salesforce SObjects → MappedRow.
 *
 * Naming convention: SF "Account" = our "company", SF "Opportunity" = our
 * "deal", SF "Contact" = our "contact", SF "Lead" = our "lead". This is
 * the cleanest mapping of any importer because Salesforce is essentially
 * the canonical CRM data model.
 */

import type { MappedRow } from "../types";
import type {
  SalesforceAccount,
  SalesforceContact,
  SalesforceLead,
  SalesforceOpportunity,
} from "./client";

export function mapSalesforceContact(c: SalesforceContact): MappedRow {
  const email = c.Email?.trim().toLowerCase() || null;
  const phone = (c.Phone || c.MobilePhone)?.trim() || null;
  return {
    entity: "contacts",
    upstreamId: c.Id,
    row: {
      first_name: c.FirstName?.trim() || (email ? email.split("@")[0] : "Unknown"),
      last_name: c.LastName?.trim() || null,
      email,
      phone,
      title: c.Title?.trim() || null,
      source: "salesforce",
      metadata: {
        salesforce_id: c.Id,
        salesforce_account_id: c.AccountId ?? null,
        salesforce_created: c.CreatedDate ?? null,
      },
    },
    dedupBy: email ? { column: "email", value: email } : undefined,
  };
}

export function mapSalesforceAccount(a: SalesforceAccount): MappedRow {
  const domain = a.Website ? extractDomain(a.Website) : null;
  return {
    entity: "companies",
    upstreamId: a.Id,
    row: {
      name: a.Name?.trim() || "Untitled",
      domain,
      industry: a.Industry?.trim() || null,
      phone: a.Phone?.trim() || null,
      website: a.Website?.trim() || null,
      city: a.BillingCity?.trim() || null,
      country: a.BillingCountry?.trim() || null,
      description: a.Description?.trim() || null,
      metadata: {
        salesforce_id: a.Id,
        salesforce_created: a.CreatedDate ?? null,
      },
    },
    dedupBy: domain ? { column: "domain", value: domain } : undefined,
  };
}

function extractDomain(website: string): string | null {
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function mapSalesforceLead(l: SalesforceLead): MappedRow {
  const email = l.Email?.trim().toLowerCase() || null;
  return {
    entity: "leads",
    upstreamId: l.Id,
    row: {
      first_name: l.FirstName?.trim() || (email ? email.split("@")[0] : "Unknown"),
      last_name: l.LastName?.trim() || null,
      email,
      phone: l.Phone?.trim() || null,
      organization: l.Company?.trim() || null,
      status: mapLeadStatus(l.Status),
      source: l.LeadSource?.trim().toLowerCase() || "salesforce",
      metadata: {
        salesforce_id: l.Id,
        salesforce_status: l.Status ?? null,
        salesforce_lead_source: l.LeadSource ?? null,
        salesforce_title: l.Title ?? null,
        salesforce_created: l.CreatedDate ?? null,
      },
    },
    dedupBy: email ? { column: "email", value: email } : undefined,
  };
}

function mapLeadStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes("unqualified") || s.includes("disqualified") || s.includes("not converted")) return "disqualified";
  if (s.includes("converted") || s.includes("qualified")) return "converted";
  if (s.includes("not contacted")) return "new";
  if (s.includes("working") || s.includes("contacted")) return "working";
  if (s.includes("new") || s.includes("open")) return "new";
  return null;
}

export function mapSalesforceOpportunity(o: SalesforceOpportunity): MappedRow {
  return {
    entity: "deals",
    upstreamId: o.Id,
    row: {
      title: o.Name?.trim() || "Untitled deal",
      amount: typeof o.Amount === "number" ? o.Amount : null,
      stage: "new",
      expected_close_date: o.CloseDate ? o.CloseDate.split("T")[0] : null,
      description: o.Description?.trim() || null,
      metadata: {
        salesforce_id: o.Id,
        salesforce_stage_name: o.StageName ?? null,
        salesforce_account_id: o.AccountId ?? null,
        salesforce_type: o.Type ?? null,
        salesforce_created: o.CreatedDate ?? null,
      },
    },
  };
}

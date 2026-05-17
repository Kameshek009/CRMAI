/**
 * HubSpot objects → MappedRow for our schema.
 *
 * We map liberally — extra fields the user can clean up post-import. The
 * goal is "minimal loss" rather than perfect translation.
 *
 * Deal stages: HubSpot has free-form `dealstage` strings; we keep the
 * upstream id in `metadata` and let the user later map to their pipeline
 * stages manually. Initial import puts everything in their default pipeline.
 */

import type { MappedRow } from "../types";
import type { HubSpotCompany, HubSpotContact, HubSpotDeal } from "./client";

export function mapHubSpotContact(contact: HubSpotContact): MappedRow {
  const p = contact.properties;
  const firstName = p.firstname?.trim() || "";
  const lastName = p.lastname?.trim() || null;
  const email = p.email?.trim().toLowerCase() || null;
  const phone = (p.phone || p.mobilephone)?.trim() || null;

  return {
    entity: "contacts",
    upstreamId: contact.id,
    row: {
      first_name: firstName || (email ? email.split("@")[0] : "Unknown"),
      last_name: lastName,
      email,
      phone,
      title: p.jobtitle?.trim() || null,
      status: mapLifecycleStage(p.lifecyclestage),
      source: "hubspot",
      metadata: {
        hubspot_id: contact.id,
        hubspot_company_name: p.company ?? null,
        hubspot_lifecyclestage: p.lifecyclestage ?? null,
        hubspot_created: p.createdate ?? null,
      },
    },
    dedupBy: email ? { column: "email", value: email } : undefined,
  };
}

function mapLifecycleStage(stage?: string): string | null {
  if (!stage) return null;
  const s = stage.toLowerCase();
  if (s.includes("subscriber") || s.includes("lead")) return "lead";
  if (s.includes("customer")) return "active";
  if (s.includes("evangelist") || s.includes("active")) return "active";
  if (s.includes("opportunity")) return "active";
  if (s.includes("other") || s.includes("churn")) return "churned";
  return null;
}

export function mapHubSpotCompany(company: HubSpotCompany): MappedRow {
  const p = company.properties;
  return {
    entity: "companies",
    upstreamId: company.id,
    row: {
      name: p.name?.trim() || "Untitled",
      domain: p.domain?.trim() || null,
      industry: p.industry?.trim() || null,
      phone: p.phone?.trim() || null,
      website: p.website?.trim() || null,
      city: p.city?.trim() || null,
      country: p.country?.trim() || null,
      description: p.description?.trim() || null,
      metadata: {
        hubspot_id: company.id,
      },
    },
    dedupBy: p.domain ? { column: "domain", value: p.domain.trim().toLowerCase() } : undefined,
  };
}

export function mapHubSpotDeal(deal: HubSpotDeal): MappedRow {
  const p = deal.properties;
  const amount = p.amount ? Number(p.amount) : null;
  return {
    entity: "deals",
    upstreamId: deal.id,
    row: {
      title: p.dealname?.trim() || "Untitled deal",
      amount: Number.isFinite(amount) ? amount : null,
      stage: "new", // user remaps later
      expected_close_date: p.closedate ? p.closedate.split("T")[0] : null,
      description: p.description?.trim() || null,
      metadata: {
        hubspot_id: deal.id,
        hubspot_dealstage: p.dealstage ?? null,
        hubspot_pipeline: p.pipeline ?? null,
        hubspot_owner_id: p.hubspot_owner_id ?? null,
        hubspot_associated_contacts: (deal.associations?.contacts?.results ?? [])
          .map((c) => c.id),
        hubspot_associated_companies: (deal.associations?.companies?.results ?? [])
          .map((c) => c.id),
      },
    },
  };
}

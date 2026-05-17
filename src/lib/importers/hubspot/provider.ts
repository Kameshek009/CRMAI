import type { ImporterProvider, ImportContext } from "../types";
import { upsertMappedBatch } from "../upsert";
import {
  iterateHubSpotCompanies,
  iterateHubSpotContacts,
  iterateHubSpotDeals,
} from "./client";
import { mapHubSpotCompany, mapHubSpotContact, mapHubSpotDeal } from "./mappers";

/**
 * Order matters for FK-like associations: companies → contacts → deals.
 * (Our schema doesn't enforce FKs across these for imports, but it keeps
 * the UI consistent: when the user opens a deal, the company already
 * exists in the contacts page.)
 */
async function runImport(ctx: ImportContext): Promise<void> {
  // Companies
  for await (const batch of iterateHubSpotCompanies(ctx.accessToken)) {
    const mapped = batch.map(mapHubSpotCompany);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "hubspot",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { companies: batch.length },
      imported: { companies: result.inserted + result.updated },
      skipped: { companies: result.skipped },
      errors: result.errors.map((e) => ({ entity: "companies", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  // Contacts
  for await (const batch of iterateHubSpotContacts(ctx.accessToken)) {
    const mapped = batch.map(mapHubSpotContact);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "hubspot",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { contacts: batch.length },
      imported: { contacts: result.inserted + result.updated },
      skipped: { contacts: result.skipped },
      errors: result.errors.map((e) => ({ entity: "contacts", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  // Deals
  for await (const batch of iterateHubSpotDeals(ctx.accessToken)) {
    const mapped = batch.map(mapHubSpotDeal);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "hubspot",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { deals: batch.length },
      imported: { deals: result.inserted + result.updated },
      skipped: { deals: result.skipped },
      errors: result.errors.map((e) => ({ entity: "deals", upstream_id: e.upstream_id, message: e.message })),
    });
  }
}

export const hubspotProvider: ImporterProvider = {
  id: "hubspot",
  label: "HubSpot",
  run: runImport,
};

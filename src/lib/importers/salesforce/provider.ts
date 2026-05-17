import type { ImporterProvider, ImportContext } from "../types";
import { upsertMappedBatch } from "../upsert";
import {
  iterateSalesforceAccounts,
  iterateSalesforceContacts,
  iterateSalesforceLeads,
  iterateSalesforceOpportunities,
} from "./client";
import {
  mapSalesforceAccount,
  mapSalesforceContact,
  mapSalesforceLead,
  mapSalesforceOpportunity,
} from "./mappers";

async function runImport(ctx: ImportContext): Promise<void> {
  const instanceUrl = (ctx.connectionMetadata.instance_url as string | undefined) ?? null;
  if (!instanceUrl) {
    throw new Error("Salesforce connection metadata is missing the instance_url");
  }
  const access = { accessToken: ctx.accessToken, instanceUrl };

  for await (const batch of iterateSalesforceAccounts(access)) {
    const mapped = batch.map(mapSalesforceAccount);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "salesforce",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { companies: batch.length },
      imported: { companies: result.inserted + result.updated },
      skipped: { companies: result.skipped },
      errors: result.errors.map((e) => ({ entity: "companies", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateSalesforceContacts(access)) {
    const mapped = batch.map(mapSalesforceContact);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "salesforce",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { contacts: batch.length },
      imported: { contacts: result.inserted + result.updated },
      skipped: { contacts: result.skipped },
      errors: result.errors.map((e) => ({ entity: "contacts", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateSalesforceLeads(access)) {
    const mapped = batch.map(mapSalesforceLead);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "salesforce",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { leads: batch.length },
      imported: { leads: result.inserted + result.updated },
      skipped: { leads: result.skipped },
      errors: result.errors.map((e) => ({ entity: "leads", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateSalesforceOpportunities(access)) {
    const mapped = batch.map(mapSalesforceOpportunity);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "salesforce",
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

export const salesforceProvider: ImporterProvider = {
  id: "salesforce",
  label: "Salesforce",
  run: runImport,
};

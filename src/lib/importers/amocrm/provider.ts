import type { ImporterProvider, ImportContext } from "../types";
import { upsertMappedBatch } from "../upsert";
import {
  iterateAmoCRMCompanies,
  iterateAmoCRMContacts,
  iterateAmoCRMLeads,
} from "./client";
import {
  mapAmoCRMCompany,
  mapAmoCRMContact,
  mapAmoCRMLead,
} from "./mappers";

async function runImport(ctx: ImportContext): Promise<void> {
  const subdomain = (ctx.connectionMetadata.subdomain as string | undefined) ?? null;
  if (!subdomain) {
    throw new Error("AmoCRM connection metadata is missing the subdomain");
  }
  const access = { accessToken: ctx.accessToken, subdomain };

  for await (const batch of iterateAmoCRMCompanies(access)) {
    const mapped = batch.map(mapAmoCRMCompany);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "amocrm",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { companies: batch.length },
      imported: { companies: result.inserted + result.updated },
      skipped: { companies: result.skipped },
      errors: result.errors.map((e) => ({ entity: "companies", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateAmoCRMContacts(access)) {
    const mapped = batch.map(mapAmoCRMContact);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "amocrm",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { contacts: batch.length },
      imported: { contacts: result.inserted + result.updated },
      skipped: { contacts: result.skipped },
      errors: result.errors.map((e) => ({ entity: "contacts", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateAmoCRMLeads(access)) {
    const mapped = batch.map(mapAmoCRMLead);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "amocrm",
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

export const amocrmProvider: ImporterProvider = {
  id: "amocrm",
  label: "amoCRM / Kommo",
  run: runImport,
};

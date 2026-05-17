import type { ImporterProvider, ImportContext } from "../types";
import { upsertMappedBatch } from "../upsert";
import {
  iterateBitrix24Companies,
  iterateBitrix24Contacts,
  iterateBitrix24Deals,
  iterateBitrix24Leads,
} from "./client";
import {
  mapBitrix24Company,
  mapBitrix24Contact,
  mapBitrix24Deal,
  mapBitrix24Lead,
} from "./mappers";

async function runImport(ctx: ImportContext): Promise<void> {
  const portalDomain = (ctx.connectionMetadata.domain as string | undefined) ?? null;
  if (!portalDomain) {
    throw new Error("Bitrix24 connection metadata is missing the portal domain");
  }
  const access = { accessToken: ctx.accessToken, portalDomain };

  for await (const batch of iterateBitrix24Companies(access)) {
    const mapped = batch.map(mapBitrix24Company);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "bitrix24",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { companies: batch.length },
      imported: { companies: result.inserted + result.updated },
      skipped: { companies: result.skipped },
      errors: result.errors.map((e) => ({ entity: "companies", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateBitrix24Contacts(access)) {
    const mapped = batch.map(mapBitrix24Contact);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "bitrix24",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { contacts: batch.length },
      imported: { contacts: result.inserted + result.updated },
      skipped: { contacts: result.skipped },
      errors: result.errors.map((e) => ({ entity: "contacts", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateBitrix24Leads(access)) {
    const mapped = batch.map(mapBitrix24Lead);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "bitrix24",
      rows: mapped,
    });
    await ctx.reportProgress({
      total: { leads: batch.length },
      imported: { leads: result.inserted + result.updated },
      skipped: { leads: result.skipped },
      errors: result.errors.map((e) => ({ entity: "leads", upstream_id: e.upstream_id, message: e.message })),
    });
  }

  for await (const batch of iterateBitrix24Deals(access)) {
    const mapped = batch.map(mapBitrix24Deal);
    const result = await upsertMappedBatch({
      teamId: ctx.teamId,
      accountId: ctx.accountId,
      provider: "bitrix24",
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

export const bitrix24Provider: ImporterProvider = {
  id: "bitrix24",
  label: "Bitrix24",
  run: runImport,
};

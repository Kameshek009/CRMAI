/**
 * Generic UPSERT for imported records — shared between HubSpot/AmoCRM/etc.
 *
 * Strategy: try to match by natural key (email / phone / provider_id in
 * metadata.import_provider_id). If found, update; otherwise insert. We
 * never delete during import — only additive. Cancelled/duplicate rows
 * count as `skipped` in progress.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { ImporterEntityType, ImporterProviderId, MappedRow } from "./types";

const TABLE_FOR_ENTITY: Record<ImporterEntityType, string> = {
  contacts: "contacts",
  companies: "companies",
  leads: "leads",
  deals: "deals",
};

export interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { entity: ImporterEntityType; upstream_id?: string; message: string }[];
}

/**
 * UPSERT a batch into a single CRM table. Records carry the
 * provider+upstream_id pair in metadata so re-imports update the same row.
 */
export async function upsertMappedBatch(args: {
  teamId: string;
  accountId: string;
  provider: ImporterProviderId;
  rows: MappedRow[];
}): Promise<UpsertResult> {
  const supabase = createSupabaseAdmin();
  const result: UpsertResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const r of args.rows) {
    const table = TABLE_FOR_ENTITY[r.entity];
    if (!table) {
      result.skipped++;
      continue;
    }

    const payload: Record<string, unknown> = {
      ...r.row,
      team_id: args.teamId,
      account_id: args.accountId,
      metadata: {
        ...((r.row.metadata as Record<string, unknown> | undefined) ?? {}),
        import_provider: args.provider,
        import_upstream_id: r.upstreamId,
      },
    };

    try {
      // Try natural-key dedup first (email/phone). If a row exists, UPDATE.
      if (r.dedupBy?.column && r.dedupBy.value) {
        const { data: existing } = await supabase
          .from(table)
          .select("id")
          .eq("team_id", args.teamId)
          .ilike(r.dedupBy.column, r.dedupBy.value)
          .limit(1)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await supabase.from(table).update(payload).eq("id", existing.id);
          if (error) {
            result.errors.push({ entity: r.entity, upstream_id: r.upstreamId, message: error.message });
          } else {
            result.updated++;
          }
          continue;
        }
      }

      // Try upstream-id dedup: search metadata->import_upstream_id
      const { data: existingByUpstream } = await supabase
        .from(table)
        .select("id")
        .eq("team_id", args.teamId)
        .filter("metadata->>import_provider", "eq", args.provider)
        .filter("metadata->>import_upstream_id", "eq", r.upstreamId)
        .limit(1)
        .maybeSingle();
      if (existingByUpstream?.id) {
        const { error } = await supabase.from(table).update(payload).eq("id", existingByUpstream.id);
        if (error) {
          result.errors.push({ entity: r.entity, upstream_id: r.upstreamId, message: error.message });
        } else {
          result.updated++;
        }
        continue;
      }

      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        result.errors.push({ entity: r.entity, upstream_id: r.upstreamId, message: error.message });
      } else {
        result.inserted++;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      result.errors.push({ entity: r.entity, upstream_id: r.upstreamId, message });
    }
  }

  return result;
}

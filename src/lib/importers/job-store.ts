/**
 * `crm_imports` table accessor. Job-runner code never touches Supabase
 * directly — all reads/writes go through here so we can swap to a queue
 * (Inngest/Trigger.dev) later without rewriting providers.
 *
 * Counters are stored as JSONB maps `{contacts: 12, deals: 3}` and merged
 * by the application layer because Postgres jsonb operators don't have an
 * "atomic numeric merge" primitive.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { ImporterProviderId, ImportError, ImporterEntityType } from "./types";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ImportJobRow {
  id: string;
  team_id: string;
  account_id: string;
  provider: ImporterProviderId;
  status: JobStatus;
  started_at: string | null;
  finished_at: string | null;
  total_records: Partial<Record<ImporterEntityType, number>>;
  imported_records: Partial<Record<ImporterEntityType, number>>;
  skipped_records: Partial<Record<ImporterEntityType, number>>;
  error_count: number;
  errors: ImportError[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const MAX_ERRORS_RETAINED = 100;

export async function createImportJob(args: {
  teamId: string;
  accountId: string;
  provider: ImporterProviderId;
  metadata?: Record<string, unknown>;
}): Promise<ImportJobRow> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("crm_imports")
    .insert({
      team_id: args.teamId,
      account_id: args.accountId,
      provider: args.provider,
      status: "pending",
      metadata: args.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`crm_imports insert failed: ${error?.message}`);
  return data as ImportJobRow;
}

export async function getImportJob(id: string, teamId: string): Promise<ImportJobRow | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("crm_imports")
    .select("*")
    .eq("id", id)
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw new Error(`crm_imports get failed: ${error.message}`);
  return (data as ImportJobRow) ?? null;
}

export async function listImportJobs(teamId: string, limit = 30): Promise<ImportJobRow[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("crm_imports")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`crm_imports list failed: ${error.message}`);
  return (data ?? []) as ImportJobRow[];
}

export async function markJobRunning(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("crm_imports")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markJobCompleted(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("crm_imports")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markJobFailed(id: string, message: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("crm_imports")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      metadata: { fatal_error: message },
    })
    .eq("id", id);
}

/**
 * Merge a delta into the job row's counters. Reads the current values,
 * adds the delta, and writes back. Last-writer-wins — fine because a job
 * has only one runner. Errors list is trimmed to MAX_ERRORS_RETAINED.
 */
export async function mergeProgress(
  id: string,
  delta: {
    total?: Partial<Record<ImporterEntityType, number>>;
    imported?: Partial<Record<ImporterEntityType, number>>;
    skipped?: Partial<Record<ImporterEntityType, number>>;
    errors?: ImportError[];
  },
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("crm_imports")
    .select("total_records, imported_records, skipped_records, errors, error_count")
    .eq("id", id)
    .maybeSingle();
  if (!row) return;

  const total = sumCounters(
    (row.total_records ?? {}) as Partial<Record<ImporterEntityType, number>>,
    delta.total,
  );
  const imported = sumCounters(
    (row.imported_records ?? {}) as Partial<Record<ImporterEntityType, number>>,
    delta.imported,
  );
  const skipped = sumCounters(
    (row.skipped_records ?? {}) as Partial<Record<ImporterEntityType, number>>,
    delta.skipped,
  );
  const existingErrors = (row.errors ?? []) as ImportError[];
  const newErrors = delta.errors ?? [];
  const allErrors = existingErrors.concat(newErrors).slice(-MAX_ERRORS_RETAINED);

  await supabase
    .from("crm_imports")
    .update({
      total_records: total,
      imported_records: imported,
      skipped_records: skipped,
      errors: allErrors,
      error_count: (row.error_count ?? 0) + newErrors.length,
    })
    .eq("id", id);
}

export function sumCounters(
  a: Partial<Record<ImporterEntityType, number>>,
  b?: Partial<Record<ImporterEntityType, number>>,
): Partial<Record<ImporterEntityType, number>> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) {
    if (typeof v !== "number") continue;
    const key = k as ImporterEntityType;
    out[key] = (out[key] ?? 0) + v;
  }
  return out;
}

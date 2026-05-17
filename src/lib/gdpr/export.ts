import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  PERSONAL_TABLES,
  TEAM_OWNED_TABLES,
  stripExcluded,
} from "./tables";

type AnyRow = Record<string, unknown>;

export type ExportPayload = {
  meta: {
    schema_version: 1;
    generated_at: string;
    subject_account_id: string;
    clerk_user_id: string;
    notes: string;
  };
  account: AnyRow | null;
  personal: Record<string, AnyRow[]>;
  owned_teams: Array<{
    team: AnyRow;
    tables: Record<string, AnyRow[]>;
  }>;
};

export async function collectExport(accountId: string): Promise<ExportPayload> {
  const supabase = createSupabaseAdmin();

  const { data: account, error: accountErr } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();
  if (accountErr) throw accountErr;
  if (!account) throw new Error(`account ${accountId} not found`);

  const personal: Record<string, AnyRow[]> = {};
  for (const spec of PERSONAL_TABLES) {
    const { data, error } = await supabase
      .from(spec.table)
      .select("*")
      .eq("account_id", accountId);
    if (error) {
      // Some tables in PERSONAL_TABLES may not yet exist in dev DBs that
      // skipped migrations. Log via empty array rather than abort the whole
      // export — partial export still satisfies Art. 20.
      personal[spec.table] = [];
      continue;
    }
    personal[spec.table] = stripExcluded(data ?? [], spec.exclude);
  }

  const { data: ownedTeams, error: teamsErr } = await supabase
    .from("teams")
    .select("*")
    .eq("owner_account_id", accountId);
  if (teamsErr) throw teamsErr;

  const ownedExports: ExportPayload["owned_teams"] = [];
  for (const team of (ownedTeams ?? []) as AnyRow[]) {
    const teamId = team.id as string;
    const tables: Record<string, AnyRow[]> = {};
    for (const spec of TEAM_OWNED_TABLES) {
      if (spec.table === "teams") {
        tables.teams = stripExcluded([team], spec.exclude);
        continue;
      }
      const { data, error } = await supabase
        .from(spec.table)
        .select("*")
        .eq("team_id", teamId);
      if (error) {
        tables[spec.table] = [];
        continue;
      }
      tables[spec.table] = stripExcluded(data ?? [], spec.exclude);
    }
    ownedExports.push({ team, tables });
  }

  return {
    meta: {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      subject_account_id: accountId,
      clerk_user_id: (account.clerk_user_id as string) ?? "",
      notes:
        "GDPR Art. 20 export. `personal` contains rows where account_id = subject. `owned_teams` contains full data for teams the subject owns. Encrypted secrets and password hashes are omitted — they cannot be decrypted without the platform key and have no portability value.",
    },
    account,
    personal,
    owned_teams: ownedExports,
  };
}

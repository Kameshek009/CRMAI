/**
 * Shared types for the importer framework.
 *
 * Each provider (HubSpot, AmoCRM, Bitrix24, Salesforce) implements the
 * `ImporterProvider` interface so the job-runner can drive them uniformly.
 * OAuth tokens live in the existing `oauth_tokens` table — migration 060
 * extended the `oauth_provider` enum to include the four importer IDs.
 */

export type ImporterProviderId = "hubspot" | "amocrm" | "bitrix24" | "salesforce";

export const SUPPORTED_IMPORTER_PROVIDERS: ImporterProviderId[] = [
  "hubspot",
  "amocrm",
  "bitrix24",
  "salesforce",
];

export type ImporterEntityType = "contacts" | "companies" | "leads" | "deals";

export interface ImportProgress {
  total: Partial<Record<ImporterEntityType, number>>;
  imported: Partial<Record<ImporterEntityType, number>>;
  skipped: Partial<Record<ImporterEntityType, number>>;
  errors: ImportError[];
}

export interface ImportError {
  entity: ImporterEntityType;
  upstream_id?: string;
  message: string;
}

export interface ImportContext {
  teamId: string;
  accountId: string;
  jobId: string;
  /**
   * Decrypted access token for the connection. Refreshed automatically by
   * the OAuth layer before the job-runner hands it off.
   */
  accessToken: string;
  /**
   * Provider-specific connection metadata (subdomain for AmoCRM, hub id
   * for HubSpot, instance URL for Salesforce).
   */
  connectionMetadata: Record<string, unknown>;
  /**
   * Callback the provider impl invokes after each batch so the job-runner
   * can persist progress, surface to the UI, and abort if the user clicks
   * Cancel.
   */
  reportProgress: (delta: Partial<ImportProgress>) => Promise<void>;
}

export interface ImporterProvider {
  id: ImporterProviderId;
  /** Human label shown in UI / errors. */
  label: string;
  /** Run a single one-shot import. Throws on fatal errors; non-fatal go to ctx.reportProgress(errors). */
  run(ctx: ImportContext): Promise<void>;
}

/** Output of one mapping step — INSERT this row into the corresponding CRM table. */
export interface MappedRow {
  entity: ImporterEntityType;
  upstreamId: string;
  /** Row body to UPSERT. team_id/account_id will be set by the runner. */
  row: Record<string, unknown>;
  /** Optional natural key for dedup (e.g. email/phone). */
  dedupBy?: { column: string; value: string };
}

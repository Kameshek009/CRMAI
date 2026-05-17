/**
 * Salesforce REST client (SOQL Query API).
 *
 * Endpoint: `<instance_url>/services/data/v60.0/query?q=<SOQL>`.
 * Pagination: response includes `nextRecordsUrl` (relative path under
 * `/services/data/`) when there are more rows. Loop until absent.
 *
 * Rate limit varies by org (API call limits). We sleep 200ms between
 * pages as a safety buffer.
 */

const API_VERSION = "v60.0";
const INTER_PAGE_SLEEP_MS = 200;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function authedGet<T>(args: {
  instanceUrl: string;
  accessToken: string;
  path: string;
}): Promise<T> {
  const url = args.path.startsWith("/") ? `${args.instanceUrl}${args.path}` : `${args.instanceUrl}/${args.path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 429 || res.status === 503) {
    await sleep(2000);
    return authedGet<T>(args);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Salesforce ${args.path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

interface SoqlResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string | null;
  LastName?: string | null;
  Email?: string | null;
  Phone?: string | null;
  MobilePhone?: string | null;
  Title?: string | null;
  AccountId?: string | null;
  CreatedDate?: string;
}

export interface SalesforceAccount {
  Id: string;
  Name?: string | null;
  Phone?: string | null;
  Website?: string | null;
  Industry?: string | null;
  BillingCity?: string | null;
  BillingCountry?: string | null;
  Description?: string | null;
  CreatedDate?: string;
}

export interface SalesforceLead {
  Id: string;
  FirstName?: string | null;
  LastName?: string | null;
  Email?: string | null;
  Phone?: string | null;
  Company?: string | null;
  Title?: string | null;
  Status?: string | null;
  LeadSource?: string | null;
  CreatedDate?: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name?: string | null;
  Amount?: number | null;
  StageName?: string | null;
  CloseDate?: string | null;
  AccountId?: string | null;
  Type?: string | null;
  Description?: string | null;
  CreatedDate?: string;
}

async function* runSoqlQuery<T>(args: {
  instanceUrl: string;
  accessToken: string;
  soql: string;
}): AsyncIterable<T[]> {
  const initial = await authedGet<SoqlResponse<T>>({
    instanceUrl: args.instanceUrl,
    accessToken: args.accessToken,
    path: `/services/data/${API_VERSION}/query?q=${encodeURIComponent(args.soql)}`,
  });
  yield initial.records;
  let next = initial.nextRecordsUrl;
  while (next) {
    await sleep(INTER_PAGE_SLEEP_MS);
    const page = await authedGet<SoqlResponse<T>>({
      instanceUrl: args.instanceUrl,
      accessToken: args.accessToken,
      path: next,
    });
    yield page.records;
    next = page.nextRecordsUrl;
  }
}

export function iterateSalesforceContacts(args: {
  instanceUrl: string;
  accessToken: string;
}): AsyncIterable<SalesforceContact[]> {
  return runSoqlQuery<SalesforceContact>({
    ...args,
    soql: "SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Title, AccountId, CreatedDate FROM Contact ORDER BY CreatedDate DESC",
  });
}

export function iterateSalesforceAccounts(args: {
  instanceUrl: string;
  accessToken: string;
}): AsyncIterable<SalesforceAccount[]> {
  return runSoqlQuery<SalesforceAccount>({
    ...args,
    soql: "SELECT Id, Name, Phone, Website, Industry, BillingCity, BillingCountry, Description, CreatedDate FROM Account ORDER BY CreatedDate DESC",
  });
}

export function iterateSalesforceLeads(args: {
  instanceUrl: string;
  accessToken: string;
}): AsyncIterable<SalesforceLead[]> {
  return runSoqlQuery<SalesforceLead>({
    ...args,
    soql: "SELECT Id, FirstName, LastName, Email, Phone, Company, Title, Status, LeadSource, CreatedDate FROM Lead WHERE IsConverted = false ORDER BY CreatedDate DESC",
  });
}

export function iterateSalesforceOpportunities(args: {
  instanceUrl: string;
  accessToken: string;
}): AsyncIterable<SalesforceOpportunity[]> {
  return runSoqlQuery<SalesforceOpportunity>({
    ...args,
    soql: "SELECT Id, Name, Amount, StageName, CloseDate, AccountId, Type, Description, CreatedDate FROM Opportunity ORDER BY CreatedDate DESC",
  });
}

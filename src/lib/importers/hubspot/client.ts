/**
 * Thin HubSpot REST client. We only need GETs for the import flow.
 *
 * Rate limit: HubSpot enforces ~110 req per 10s per app on standard tier.
 * We add a small inter-page sleep to stay below.
 *
 * Pagination: HubSpot returns `paging.next.after` cursor. Loop until absent.
 */

const HUBSPOT_API = "https://api.hubapi.com";

const PER_PAGE = 100;
const INTER_PAGE_SLEEP_MS = 150;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function authedGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 429) {
    // HubSpot tells you to back off via Retry-After.
    const retry = Number(res.headers.get("retry-after") ?? "5");
    await sleep(Math.min(30_000, retry * 1000));
    return authedGet<T>(accessToken, path);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HubSpot ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

interface HubSpotPagedResponse<T> {
  results: T[];
  paging?: { next?: { after?: string } };
}

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    mobilephone?: string;
    jobtitle?: string;
    company?: string;
    lifecyclestage?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
    website?: string;
    city?: string;
    country?: string;
    description?: string;
  };
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    description?: string;
    hubspot_owner_id?: string;
  };
  associations?: {
    contacts?: { results?: Array<{ id: string }> };
    companies?: { results?: Array<{ id: string }> };
  };
}

const CONTACT_PROPS = [
  "email",
  "firstname",
  "lastname",
  "phone",
  "mobilephone",
  "jobtitle",
  "company",
  "lifecyclestage",
  "createdate",
  "lastmodifieddate",
].join(",");

const COMPANY_PROPS = [
  "name",
  "domain",
  "industry",
  "phone",
  "website",
  "city",
  "country",
  "description",
].join(",");

const DEAL_PROPS = [
  "dealname",
  "amount",
  "dealstage",
  "pipeline",
  "closedate",
  "createdate",
  "description",
  "hubspot_owner_id",
].join(",");

export async function* iterateHubSpotContacts(
  accessToken: string,
): AsyncIterable<HubSpotContact[]> {
  let after: string | undefined;
  while (true) {
    const qs = new URLSearchParams({ limit: String(PER_PAGE), properties: CONTACT_PROPS });
    if (after) qs.set("after", after);
    const page = await authedGet<HubSpotPagedResponse<HubSpotContact>>(
      accessToken,
      `/crm/v3/objects/contacts?${qs.toString()}`,
    );
    yield page.results;
    after = page.paging?.next?.after;
    if (!after) break;
    await sleep(INTER_PAGE_SLEEP_MS);
  }
}

export async function* iterateHubSpotCompanies(
  accessToken: string,
): AsyncIterable<HubSpotCompany[]> {
  let after: string | undefined;
  while (true) {
    const qs = new URLSearchParams({ limit: String(PER_PAGE), properties: COMPANY_PROPS });
    if (after) qs.set("after", after);
    const page = await authedGet<HubSpotPagedResponse<HubSpotCompany>>(
      accessToken,
      `/crm/v3/objects/companies?${qs.toString()}`,
    );
    yield page.results;
    after = page.paging?.next?.after;
    if (!after) break;
    await sleep(INTER_PAGE_SLEEP_MS);
  }
}

export async function* iterateHubSpotDeals(accessToken: string): AsyncIterable<HubSpotDeal[]> {
  let after: string | undefined;
  while (true) {
    const qs = new URLSearchParams({
      limit: String(PER_PAGE),
      properties: DEAL_PROPS,
      associations: "contacts,companies",
    });
    if (after) qs.set("after", after);
    const page = await authedGet<HubSpotPagedResponse<HubSpotDeal>>(
      accessToken,
      `/crm/v3/objects/deals?${qs.toString()}`,
    );
    yield page.results;
    after = page.paging?.next?.after;
    if (!after) break;
    await sleep(INTER_PAGE_SLEEP_MS);
  }
}

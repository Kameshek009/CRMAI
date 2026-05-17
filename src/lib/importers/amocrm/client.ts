/**
 * AmoCRM REST v4 client. Subdomain comes from the OAuth token row.
 *
 * Pagination: `?page=N&limit=250`. Response is HAL JSON; `_embedded` has
 * the array, `_links.next.href` indicates more pages.
 *
 * Rate limit: ~7 req/sec per account (default). We sleep 150ms between
 * pages to stay below.
 */

const PER_PAGE = 250;
const INTER_PAGE_SLEEP_MS = 150;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function authedGet<T>(args: {
  accessToken: string;
  subdomain: string;
  path: string;
}): Promise<T> {
  const url = `https://${args.subdomain}/api/v4${args.path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 429) {
    await sleep(2000);
    return authedGet<T>(args);
  }
  if (res.status === 204) {
    // AmoCRM uses 204 for "no records"
    return {} as T;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AmoCRM ${args.path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

interface AmoCRMPagedResponse<TItem> {
  _embedded?: Record<string, TItem[]>;
  _links?: { next?: { href: string } };
  _page?: number;
  _total_items?: number;
}

export interface AmoCRMContact {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  responsible_user_id?: number;
  created_at?: number;
  updated_at?: number;
  custom_fields_values?: Array<{
    field_code?: string;
    field_name?: string;
    values: Array<{ value: string | number; enum_code?: string }>;
  }>;
  _embedded?: {
    companies?: Array<{ id: number }>;
    tags?: Array<{ id: number; name: string }>;
  };
}

export interface AmoCRMCompany {
  id: number;
  name: string;
  custom_fields_values?: AmoCRMContact["custom_fields_values"];
  created_at?: number;
  updated_at?: number;
}

export interface AmoCRMLead {
  id: number;
  name: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  created_at?: number;
  updated_at?: number;
  closed_at?: number;
  _embedded?: {
    contacts?: Array<{ id: number }>;
    companies?: Array<{ id: number }>;
  };
}

async function* iteratePages<T>(args: {
  accessToken: string;
  subdomain: string;
  resource: "contacts" | "companies" | "leads";
}): AsyncIterable<T[]> {
  let page = 1;
  while (true) {
    const resp = await authedGet<AmoCRMPagedResponse<T>>({
      accessToken: args.accessToken,
      subdomain: args.subdomain,
      path: `/${args.resource}?page=${page}&limit=${PER_PAGE}&with=contacts,companies`,
    });
    const items = resp._embedded?.[args.resource] ?? [];
    if (items.length === 0) break;
    yield items;
    if (!resp._links?.next) break;
    page += 1;
    await sleep(INTER_PAGE_SLEEP_MS);
  }
}

export function iterateAmoCRMContacts(args: {
  accessToken: string;
  subdomain: string;
}): AsyncIterable<AmoCRMContact[]> {
  return iteratePages<AmoCRMContact>({ ...args, resource: "contacts" });
}

export function iterateAmoCRMCompanies(args: {
  accessToken: string;
  subdomain: string;
}): AsyncIterable<AmoCRMCompany[]> {
  return iteratePages<AmoCRMCompany>({ ...args, resource: "companies" });
}

export function iterateAmoCRMLeads(args: {
  accessToken: string;
  subdomain: string;
}): AsyncIterable<AmoCRMLead[]> {
  return iteratePages<AmoCRMLead>({ ...args, resource: "leads" });
}

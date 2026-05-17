/**
 * Bitrix24 REST v1 client.
 *
 * Endpoint base: `https://<portal>.bitrix24.ru/rest/<method>?auth=<token>`
 * Each method returns:
 *   { result: TItem[] | TItem, next?: number, total?: number, time?: ... }
 *
 * Pagination: pass `start=N` to fetch the next page; loop until `next` is
 * absent. Per-page limit is hard-coded by Bitrix at 50.
 *
 * Rate limit: ~2 req/sec per portal; we sleep 250ms between pages.
 */

const PER_PAGE_HINT = 50; // Bitrix returns up to 50 records per page
const INTER_PAGE_SLEEP_MS = 250;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

interface Bitrix24Response<T> {
  result: T;
  next?: number;
  total?: number;
  error?: string;
  error_description?: string;
}

async function call<T>(args: {
  portalDomain: string;
  accessToken: string;
  method: string;
  params?: Record<string, string>;
}): Promise<Bitrix24Response<T>> {
  const url = new URL(`https://${args.portalDomain}/rest/${args.method}.json`);
  url.searchParams.set("auth", args.accessToken);
  for (const [k, v] of Object.entries(args.params ?? {})) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (res.status === 429) {
    await sleep(2000);
    return call<T>(args);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bitrix24 ${args.method} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as Bitrix24Response<T>;
  if (json.error) {
    throw new Error(`Bitrix24 ${args.method}: ${json.error} ${json.error_description ?? ""}`.trim());
  }
  return json;
}

export interface Bitrix24Lead {
  ID: string;
  TITLE?: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  STATUS_ID?: string;
  SOURCE_ID?: string;
  OPPORTUNITY?: string;
  CURRENCY_ID?: string;
  COMPANY_TITLE?: string;
  COMMENTS?: string;
  EMAIL?: Array<{ VALUE?: string; VALUE_TYPE?: string }>;
  PHONE?: Array<{ VALUE?: string; VALUE_TYPE?: string }>;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
}

export interface Bitrix24Contact {
  ID: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  POST?: string;
  EMAIL?: Array<{ VALUE?: string }>;
  PHONE?: Array<{ VALUE?: string }>;
  COMPANY_ID?: string;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
}

export interface Bitrix24Company {
  ID: string;
  TITLE?: string;
  INDUSTRY?: string;
  PHONE?: Array<{ VALUE?: string }>;
  WEB?: Array<{ VALUE?: string }>;
  ADDRESS_CITY?: string;
  ADDRESS_COUNTRY?: string;
  COMMENTS?: string;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
}

export interface Bitrix24Deal {
  ID: string;
  TITLE?: string;
  OPPORTUNITY?: string;
  CURRENCY_ID?: string;
  STAGE_ID?: string;
  CATEGORY_ID?: string;
  CLOSEDATE?: string;
  COMPANY_ID?: string;
  CONTACT_ID?: string;
  COMMENTS?: string;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
}

async function* iterateList<T>(args: {
  portalDomain: string;
  accessToken: string;
  method: string;
}): AsyncIterable<T[]> {
  let start = 0;
  while (true) {
    const resp = await call<T[]>({
      portalDomain: args.portalDomain,
      accessToken: args.accessToken,
      method: args.method,
      params: { start: String(start) },
    });
    const items = Array.isArray(resp.result) ? resp.result : [];
    if (items.length === 0) break;
    yield items;
    if (typeof resp.next !== "number") break;
    start = resp.next;
    await sleep(INTER_PAGE_SLEEP_MS);
  }
}

export function iterateBitrix24Leads(args: {
  portalDomain: string;
  accessToken: string;
}): AsyncIterable<Bitrix24Lead[]> {
  return iterateList<Bitrix24Lead>({ ...args, method: "crm.lead.list" });
}

export function iterateBitrix24Contacts(args: {
  portalDomain: string;
  accessToken: string;
}): AsyncIterable<Bitrix24Contact[]> {
  return iterateList<Bitrix24Contact>({ ...args, method: "crm.contact.list" });
}

export function iterateBitrix24Companies(args: {
  portalDomain: string;
  accessToken: string;
}): AsyncIterable<Bitrix24Company[]> {
  return iterateList<Bitrix24Company>({ ...args, method: "crm.company.list" });
}

export function iterateBitrix24Deals(args: {
  portalDomain: string;
  accessToken: string;
}): AsyncIterable<Bitrix24Deal[]> {
  return iterateList<Bitrix24Deal>({ ...args, method: "crm.deal.list" });
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function _hint() {
  // Reference PER_PAGE_HINT so lint doesn't warn about an unused constant.
  // The default is set on the Bitrix side; we don't pass it ourselves.
  return PER_PAGE_HINT;
}

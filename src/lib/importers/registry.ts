import type { ImporterProvider, ImporterProviderId } from "./types";
import { hubspotProvider } from "./hubspot/provider";
import { amocrmProvider } from "./amocrm/provider";
import { bitrix24Provider } from "./bitrix24/provider";
import { salesforceProvider } from "./salesforce/provider";

const REGISTRY: Record<ImporterProviderId, ImporterProvider | undefined> = {
  hubspot: hubspotProvider,
  amocrm: amocrmProvider,
  bitrix24: bitrix24Provider,
  salesforce: salesforceProvider,
};

export function getImporterProvider(id: ImporterProviderId): ImporterProvider | null {
  return REGISTRY[id] ?? null;
}

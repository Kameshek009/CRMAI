import type { ImporterProvider, ImporterProviderId } from "./types";
import { hubspotProvider } from "./hubspot/provider";
import { amocrmProvider } from "./amocrm/provider";
import { bitrix24Provider } from "./bitrix24/provider";

const REGISTRY: Record<ImporterProviderId, ImporterProvider | undefined> = {
  hubspot: hubspotProvider,
  amocrm: amocrmProvider,
  bitrix24: bitrix24Provider,
  salesforce: undefined,
};

export function getImporterProvider(id: ImporterProviderId): ImporterProvider | null {
  return REGISTRY[id] ?? null;
}

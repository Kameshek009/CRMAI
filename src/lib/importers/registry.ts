import type { ImporterProvider, ImporterProviderId } from "./types";
import { hubspotProvider } from "./hubspot/provider";
import { amocrmProvider } from "./amocrm/provider";

const REGISTRY: Record<ImporterProviderId, ImporterProvider | undefined> = {
  hubspot: hubspotProvider,
  amocrm: amocrmProvider,
  bitrix24: undefined,
  salesforce: undefined,
};

export function getImporterProvider(id: ImporterProviderId): ImporterProvider | null {
  return REGISTRY[id] ?? null;
}

import type { TelephonyProvider, TelephonyProviderId } from "./types";
import { twilioProvider } from "./twilio";

const REGISTRY: Record<TelephonyProviderId, TelephonyProvider | undefined> = {
  twilio: twilioProvider,
  // mango: coming next — same TelephonyProvider interface.
  mango: undefined,
};

export function getTelephonyProvider(id: TelephonyProviderId): TelephonyProvider | null {
  return REGISTRY[id] ?? null;
}

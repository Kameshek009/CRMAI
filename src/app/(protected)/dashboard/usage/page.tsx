import type { Metadata } from "next";
import { UsageContent } from "./usage-content";

export const metadata: Metadata = { title: "Usage" };

export default function UsagePage() {
  return <UsageContent />;
}

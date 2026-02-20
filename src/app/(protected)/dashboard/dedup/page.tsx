import type { Metadata } from "next";
import { DedupContent } from "./dedup-content";

export const metadata: Metadata = { title: "Deduplication" };

export default function DedupPage() {
  return <DedupContent />;
}

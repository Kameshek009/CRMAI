import type { Metadata } from "next";
import { LeadsContent } from "./leads-content";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return <LeadsContent />;
}

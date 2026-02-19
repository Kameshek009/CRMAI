import type { Metadata } from "next";
import { LeadDetailContent } from "./lead-detail-content";

export const metadata: Metadata = { title: "Lead Detail" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeadDetailContent leadId={id} />;
}

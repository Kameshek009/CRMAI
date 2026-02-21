import { LeadDetailContent } from "./lead-detail-content";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <LeadDetailContent leadId={id} />
    </ErrorBoundary>
  );
}

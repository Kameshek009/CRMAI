import { DealDetailContent } from "./deal-detail-content";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <DealDetailContent dealId={id} />
    </ErrorBoundary>
  );
}

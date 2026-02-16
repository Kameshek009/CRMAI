import { CompanyDetailContent } from "./company-detail-content";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <CompanyDetailContent companyId={id} />
    </ErrorBoundary>
  );
}

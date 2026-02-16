import { ContactDetailContent } from "./contact-detail-content";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <ContactDetailContent contactId={id} />
    </ErrorBoundary>
  );
}

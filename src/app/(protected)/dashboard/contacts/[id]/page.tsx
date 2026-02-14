import { ContactDetailContent } from "./contact-detail-content";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailContent contactId={id} />;
}

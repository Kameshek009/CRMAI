import { DealDetailContent } from "./deal-detail-content";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DealDetailContent dealId={id} />;
}

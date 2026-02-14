"use client";

import { PageContainer, Card } from "@/components/dashboard/page-container";

export default function SessionsPage() {
  return (
    <PageContainer>
      <Card>
        <p className="text-sm font-medium mb-4">Sessions</p>
        <p className="text-sm text-muted-foreground">
          No sessions recorded yet
        </p>
      </Card>
    </PageContainer>
  );
}

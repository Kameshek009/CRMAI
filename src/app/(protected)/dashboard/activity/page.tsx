"use client";

import { PageContainer, Card } from "@/components/dashboard/page-container";

export default function ActivityPage() {
  return (
    <PageContainer>
      <Card>
        <p className="text-sm font-medium mb-4">Activity Log</p>
        <p className="text-sm text-muted-foreground">
          No activity recorded yet
        </p>
      </Card>
    </PageContainer>
  );
}

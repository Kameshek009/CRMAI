"use client";

import { PageContainer, Card } from "@/components/dashboard/page-container";
import { Terminal } from "lucide-react";

export default function ConsolePage() {
  return (
    <PageContainer>
      <Card>
        <div className="py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--secondary)] flex items-center justify-center mx-auto">
            <Terminal className="w-6 h-6 text-[var(--muted-foreground)]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium">Console</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Connect your desktop agent to use the console
            </p>
          </div>
          <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-[var(--warning)]/10 text-[var(--warning)]">
            Beta
          </span>
        </div>
      </Card>
    </PageContainer>
  );
}

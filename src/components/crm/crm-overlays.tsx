"use client";

import { SearchDialog } from "@/components/crm/search-dialog";
import { AiChatPanel } from "@/components/crm/ai-chat-panel";

export function CrmOverlays() {
  return (
    <>
      <SearchDialog />
      <AiChatPanel />
    </>
  );
}

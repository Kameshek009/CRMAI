import type { Metadata } from "next";
import { ChatsContent } from "./chats-content";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsPage() {
  return (
    <ErrorBoundary>
      <ChatsContent />
    </ErrorBoundary>
  );
}

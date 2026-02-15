import type { Metadata } from "next";
import { ChatsContent } from "./chats-content";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsPage() {
  return <ChatsContent />;
}

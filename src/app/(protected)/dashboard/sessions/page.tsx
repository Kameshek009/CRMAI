import type { Metadata } from "next";
import { SessionsContent } from "./sessions-content";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return <SessionsContent />;
}

import type { Metadata } from "next";
import { ConsoleContent } from "./console-content";

export const metadata: Metadata = { title: "Console" };

export default function ConsolePage() {
  return <ConsoleContent />;
}

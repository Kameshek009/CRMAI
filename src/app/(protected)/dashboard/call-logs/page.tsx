import type { Metadata } from "next";
import { CallLogsContent } from "./call-logs-content";

export const metadata: Metadata = { title: "Call Logs" };

export default function CallLogsPage() {
  return <CallLogsContent />;
}

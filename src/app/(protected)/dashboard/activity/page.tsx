import type { Metadata } from "next";
import { ActivityContent } from "./activity-content";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return <ActivityContent />;
}

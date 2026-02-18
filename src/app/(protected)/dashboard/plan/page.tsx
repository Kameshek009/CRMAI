import type { Metadata } from "next";
import { PlanContent } from "./plan-content";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return <PlanContent />;
}

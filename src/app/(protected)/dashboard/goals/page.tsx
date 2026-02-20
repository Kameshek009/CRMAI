import type { Metadata } from "next";
import { GoalsContent } from "./goals-content";

export const metadata: Metadata = { title: "Goals & Quotas" };

export default function GoalsPage() {
  return <GoalsContent />;
}

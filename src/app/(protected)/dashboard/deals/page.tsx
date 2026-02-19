import type { Metadata } from "next";
import { DealsContent } from "./deals-content";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage() {
  return <DealsContent />;
}

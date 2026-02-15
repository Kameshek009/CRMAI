import type { Metadata } from "next";
import { CompaniesContent } from "./companies-content";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return <CompaniesContent />;
}

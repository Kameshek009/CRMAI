import type { Metadata } from "next";
import { TeamContent } from "./team-content";

export const metadata: Metadata = { title: "Team" };

export default function TeamOverviewPage() {
  return <TeamContent />;
}

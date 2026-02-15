import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UpgradeContent } from "./upgrade-content";

export const metadata: Metadata = { title: "Upgrade" };

export default async function UpgradePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <UpgradeContent />;
}

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <DashboardContent
      userName={user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"}
      email={user.primaryEmailAddress?.emailAddress || ""}
      imageUrl={user.imageUrl}
    />
  );
}

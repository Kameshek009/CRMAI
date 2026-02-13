import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AccountContent } from "./account-content";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <AccountContent
      email={user.primaryEmailAddress?.emailAddress || ""}
      name={`${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"}
      imageUrl={user.imageUrl}
    />
  );
}

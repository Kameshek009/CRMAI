import { redirect } from "next/navigation";

export default function TeamMembersPage() {
  redirect("/dashboard/account?tab=members");
}

import { redirect } from "next/navigation";

export default function TeamOverviewPage() {
  redirect("/dashboard/account?tab=team");
}

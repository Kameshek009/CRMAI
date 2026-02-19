import { redirect } from "next/navigation";

export default function TeamRolesPage() {
  redirect("/dashboard/account?tab=roles");
}

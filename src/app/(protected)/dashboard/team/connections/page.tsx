import { redirect } from "next/navigation";

export default function TeamConnectionsPage() {
  redirect("/dashboard/account?tab=connections");
}

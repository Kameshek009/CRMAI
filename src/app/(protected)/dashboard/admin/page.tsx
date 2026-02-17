import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ADMIN_CLERK_USER_ID } from "@/lib/constants/admin";
import { AdminContent } from "./admin-content";

export const metadata: Metadata = { title: "Admin Panel" };

export default async function AdminPage() {
  const { userId } = await auth();
  if (userId !== ADMIN_CLERK_USER_ID) {
    redirect("/dashboard");
  }
  return <AdminContent />;
}

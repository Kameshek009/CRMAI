import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";

export default async function RootPage() {
  const user = await currentUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}

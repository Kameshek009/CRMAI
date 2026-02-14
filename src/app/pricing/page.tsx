import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingPage } from "@/components/landing/pricing-page";

export default async function Pricing() {
  const user = await currentUser();

  if (user) {
    redirect("/dashboard/account/billing");
  }

  return <PricingPage />;
}

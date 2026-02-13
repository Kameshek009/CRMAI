"use client";

import { useState, useEffect } from "react";
import { PublicAuthHeader } from "@/components/public-auth-header";
import { AuthModal } from "@/components/auth-modal";

export function AuthPageWithModal({ variant }: { variant: "signin" | "signup" }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [variant]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <PublicAuthHeader />
      <main className="flex-1" />
      <AuthModal variant={variant} open={open} onOpenChange={setOpen} />
    </div>
  );
}

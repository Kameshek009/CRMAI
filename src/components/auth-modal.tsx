"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export function AuthModal({
  variant,
  open,
  onOpenChange,
}: {
  variant: "signin" | "signup";
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-2xl border-2 border-[var(--border)] [&_.cl-rootBox]:w-full [&_.cl-card]:shadow-none [&_.cl-cardBox]:p-0"
        showCloseButton={true}
      >
        {variant === "signin" ? (
          <SignIn
            afterSignInUrl="/dashboard"
            signUpUrl="/sign-up"
          />
        ) : (
          <SignUp
            afterSignUpUrl="/dashboard"
            signInUrl="/sign-in"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

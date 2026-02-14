"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { PublicAuthHeader } from "@/components/public-auth-header";
import { PublicAuthContent } from "@/components/public-auth-content";

export function AuthPageWithModal({ variant }: { variant: "signin" | "signup" }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      {variant === "signin" ? (
        <PublicAuthContent
          title="Welcome back"
          subtitle="Sign in to your account to continue"
          footerText="Don't have an account?"
          footerLinkLabel="Sign up"
          footerLinkHref="/sign-up"
        >
          <SignIn
            afterSignInUrl="/dashboard"
            signUpUrl="/sign-up"
            appearance={{ elements: { footer: { display: "none" } } }}
          />
        </PublicAuthContent>
      ) : (
        <PublicAuthContent
          title="Create an account"
          subtitle="Get started with NexusCRM"
          footerText="Already have an account?"
          footerLinkLabel="Sign in"
          footerLinkHref="/sign-in"
        >
          <SignUp
            afterSignUpUrl="/dashboard"
            signInUrl="/sign-in"
            appearance={{ elements: { footer: { display: "none" } } }}
          />
        </PublicAuthContent>
      )}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "auto" | "light" | "dark";
}

export function Logo({ className, size = 32, variant = "auto" }: LogoProps) {
  const getFill = () => {
    switch (variant) {
      case "light":
        return "white";
      case "dark":
        return "black";
      default:
        return "currentColor";
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 574 574"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <path
        d="M178.735 62.4379L573.069 62.4377L549.917 150.625L207.342 83.0412L318.633 278.919L520.328 294.134L445.335 511.208L0.634332 511.208L50.2949 389.321L432.7 482.109L318.633 278.919L77.0721 294.134L178.735 62.4379Z"
        fill={getFill()}
      />
    </svg>
  );
}

export function LogoWithText({
  className,
  size = 32,
  variant = "auto",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo size={size} variant={variant} />
      <span className="font-semibold text-lg tracking-tight">Nexxus CRM</span>
    </div>
  );
}

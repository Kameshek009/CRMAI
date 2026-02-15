"use client";

import { useTeam } from "@/contexts/team-context";
import { type ReactNode } from "react";

interface TeamGuardProps {
  children: ReactNode;
}

export function TeamGuard({ children }: TeamGuardProps) {
  const { isLoading } = useTeam();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

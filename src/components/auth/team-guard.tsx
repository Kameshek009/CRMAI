"use client";

import { useWorkspace } from "@/contexts/team-context";
import { type ReactNode } from "react";

interface WorkspaceGuardProps {
  children: ReactNode;
}

export function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

/** @deprecated Use WorkspaceGuard */
export const TeamGuard = WorkspaceGuard;

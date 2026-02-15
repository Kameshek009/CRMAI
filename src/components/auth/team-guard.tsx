"use client";

import { useTeam } from "@/contexts/team-context";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface TeamGuardProps {
  children: ReactNode;
}

export function TeamGuard({ children }: TeamGuardProps) {
  const { currentTeam, isLoading } = useTeam();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentTeam) {
      router.push("/join-team");
    }
  }, [isLoading, currentTeam, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentTeam) {
    return null;
  }

  return <>{children}</>;
}

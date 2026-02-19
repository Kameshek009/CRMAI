"use client";

import { useWorkspace } from "@/contexts/team-context";
import { ReactNode } from "react";

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can } = useWorkspace();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

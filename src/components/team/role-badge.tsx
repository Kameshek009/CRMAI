"use client";

import { memo } from "react";

interface RoleBadgeProps {
  name: string;
  color: string;
}

export const RoleBadge = memo(function RoleBadge({ name, color }: RoleBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {name}
    </span>
  );
});

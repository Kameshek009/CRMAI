"use client";

import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  name: string;
  color: string;
  is_won?: boolean;
  is_lost?: boolean;
}

interface StageSelectorProps {
  stages: Stage[];
  value: string;
  onChange: (stageId: string) => void;
}

export function StageSelector({ stages, value, onChange }: StageSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
        "shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
    >
      {stages.map((stage) => (
        <option key={stage.id} value={stage.id}>
          {stage.name} {stage.is_won ? "(Won)" : stage.is_lost ? "(Lost)" : ""}
        </option>
      ))}
    </select>
  );
}

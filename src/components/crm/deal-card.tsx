"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, GripVertical } from "lucide-react";
import Link from "next/link";

interface DealCardProps {
  id: string;
  title: string;
  value: number;
  aiWinProbability: number;
  contactName?: string | null;
  companyName?: string | null;
  expectedCloseDate?: string | null;
  isDraggable?: boolean;
}

export function DealCard({
  id,
  title,
  value,
  aiWinProbability,
  contactName,
  companyName,
  expectedCloseDate,
  isDraggable = true,
}: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getRiskColor = () => {
    if (aiWinProbability >= 70) return "text-emerald-600";
    if (aiWinProbability >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getRiskLabel = () => {
    if (aiWinProbability >= 70) return "Hot";
    if (aiWinProbability >= 40) return "Warm";
    return "At Risk";
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3 cursor-default hover:shadow-md transition-shadow">
        <div className="flex items-start gap-2">
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/deals/${id}`}
              className="font-medium text-sm hover:underline truncate block"
            >
              {title}
            </Link>
            <p className="text-lg font-semibold mt-1">
              ${value.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {companyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" />
                  {companyName}
                </span>
              )}
              {contactName && (
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {contactName}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className={`text-xs ${getRiskColor()}`}>
                {getRiskLabel()} ({aiWinProbability}%)
              </Badge>
              {expectedCloseDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(expectedCloseDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

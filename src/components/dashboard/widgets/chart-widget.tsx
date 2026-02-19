"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ChartWidgetProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function ChartWidget({ title, icon: Icon, children, emptyIcon: EmptyIcon, emptyMessage, isEmpty }: ChartWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
            <Icon className="w-3 h-3 text-muted-foreground" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty && EmptyIcon ? (
          <div className="text-center py-8">
            <EmptyIcon className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface TableWidgetProps {
  title: string;
  icon: LucideIcon;
  href?: string;
  hrefLabel?: string;
  totalCount?: number;
  children: ReactNode;
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function TableWidget({
  title,
  icon: Icon,
  href,
  hrefLabel = "View All",
  totalCount,
  children,
  emptyIcon: EmptyIcon,
  emptyMessage,
  isEmpty,
}: TableWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
              <Icon className="w-3 h-3 text-muted-foreground" />
            </div>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalCount != null && (
              <Badge variant="secondary" className="text-xs">{totalCount} total</Badge>
            )}
            {href && (
              <Button variant="outline" size="sm" className="h-7 text-xs group/btn" asChild>
                <Link href={href}>
                  {hrefLabel}
                  <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty && EmptyIcon ? (
          <div className="text-center py-8">
            <EmptyIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

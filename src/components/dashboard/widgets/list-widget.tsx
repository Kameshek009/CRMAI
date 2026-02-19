"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ListWidgetProps {
  title: string;
  icon: LucideIcon;
  href?: string;
  children: ReactNode;
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function ListWidget({ title, icon: Icon, href, children, emptyIcon: EmptyIcon, emptyMessage, isEmpty }: ListWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
              <Icon className="w-3 h-3 text-muted-foreground" />
            </div>
            {title}
          </span>
          {href && (
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/80" asChild>
              <Link href={href}>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty && EmptyIcon ? (
          <div className="text-center py-6">
            <EmptyIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

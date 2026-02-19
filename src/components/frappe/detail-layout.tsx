"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// Types
// ============================================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DetailTab {
  value: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

interface DetailLayoutProps {
  // Breadcrumb
  breadcrumbs: BreadcrumbItem[];

  // Header
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;

  // Tabs (left column)
  tabs: DetailTab[];
  defaultTab?: string;

  // Form fields (right column)
  sidePanel: React.ReactNode;

  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DetailLayout({
  breadcrumbs,
  title,
  subtitle,
  status,
  actions,
  tabs,
  defaultTab,
  sidePanel,
  className,
}: DetailLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{title}</h1>
            {status}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column: tabs with content (60%) */}
        <div className="lg:col-span-3">
          <Tabs defaultValue={defaultTab || tabs[0]?.value}>
            <TabsList variant="line" className="w-full justify-start">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right column: form fields (40%) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border p-4 space-y-4 sticky top-24">
            {sidePanel}
          </div>
        </div>
      </div>
    </div>
  );
}

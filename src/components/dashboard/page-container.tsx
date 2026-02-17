"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card as ShadcnCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("p-8 page-gradient-bg min-h-full", className)}>
      <div className="mx-auto max-w-5xl space-y-8 relative z-[1]">
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1.5 section-header-line">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex items-center gap-3"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Section({ children, className, title, description }: SectionProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {(title || description) && (
        <div className="space-y-1.5 section-header-line">
          {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Card({ children, className, title, description }: CardProps) {
  if (title || description) {
    return (
      <ShadcnCard className={cn("", className)}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </ShadcnCard>
    );
  }

  return (
    <ShadcnCard className={cn("", className)}>
      <CardContent className="p-6">{children}</CardContent>
    </ShadcnCard>
  );
}

interface CardRowProps {
  children: React.ReactNode;
  className?: string;
}

export function CardRow({ children, className }: CardRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 border-b last:border-0 last:pb-0 first:pt-0",
        className
      )}
    >
      {children}
    </div>
  );
}

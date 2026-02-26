"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { logger } from "@/lib/logger";

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <AlertTriangle className="size-12 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">{t("common.somethingWentWrong")}</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {t("common.errorUnexpected")}
      </p>
      {error && (
        <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted p-2 rounded max-w-md truncate">
          {error.message}
        </p>
      )}
      <Button onClick={onReset} variant="outline">
        {t("common.tryAgain")}
      </Button>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error("ErrorBoundary", "Caught an error", { error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

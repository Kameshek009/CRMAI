"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Plug, Cloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

type ProviderId = "hubspot" | "amocrm" | "bitrix24" | "salesforce";

interface ProviderStatus {
  id: ProviderId;
  label: string;
  configured: boolean;
  connected: boolean;
  connected_at: string | null;
  connection_metadata: Record<string, unknown> | null;
}

interface ImportJob {
  id: string;
  provider: ProviderId;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at: string | null;
  finished_at: string | null;
  total_records: Record<string, number>;
  imported_records: Record<string, number>;
  skipped_records: Record<string, number>;
  error_count: number;
  errors: Array<{ entity: string; upstream_id?: string; message: string }>;
}

interface LiveImportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function LiveImportPanel({ open, onOpenChange, onComplete }: LiveImportPanelProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingProvider, setImportingProvider] = useState<ProviderId | null>(null);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);

  const refreshProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/import/providers/status");
      const json = await res.json();
      if (json.success) setProviders(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    refreshProviders();
  }, [open]);

  // Poll the active job every 2s until terminal.
  useEffect(() => {
    if (!activeJob || ["completed", "failed", "cancelled"].includes(activeJob.status)) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/crm/import/jobs/${activeJob.id}`);
        const json = await res.json();
        if (json.success) {
          setActiveJob(json.data as ImportJob);
          if (json.data.status === "completed") {
            toast.success(t("import.live.completed"));
            onComplete?.();
          } else if (json.data.status === "failed") {
            toast.error(t("import.live.failed"));
          }
        }
      } catch {
        // continue polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeJob, onComplete, t]);

  const startConnect = (providerId: ProviderId) => {
    if (providerId === "bitrix24") {
      const portal = window.prompt(
        "Enter your Bitrix24 portal domain (e.g. mycompany.bitrix24.ru):",
      );
      if (!portal) return;
      const trimmed = portal.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
      window.location.href = `/api/oauth/importers/bitrix24/start?portal=${encodeURIComponent(trimmed)}&return_to=/dashboard/contacts`;
      return;
    }
    window.location.href = `/api/oauth/importers/${providerId}/start?return_to=/dashboard/contacts`;
  };

  const startImport = async (providerId: ProviderId) => {
    setImportingProvider(providerId);
    try {
      const res = await fetch(`/api/crm/import/${providerId}/run`, { method: "POST" });
      const json = await res.json();
      if (json.success && json.data?.job_id) {
        toast.success(t("import.live.started"));
        // Fetch initial job state then start polling
        const detailRes = await fetch(`/api/crm/import/jobs/${json.data.job_id}`);
        const detailJson = await detailRes.json();
        if (detailJson.success) setActiveJob(detailJson.data as ImportJob);
      } else {
        toast.error(json.error || t("import.live.startFailed"));
      }
    } catch {
      toast.error(t("import.live.startFailed"));
    } finally {
      setImportingProvider(null);
    }
  };

  const renderProgress = (job: ImportJob) => {
    const imported = sumCounts(job.imported_records);
    const total = sumCounts(job.total_records) || 1;
    const pct = Math.min(100, Math.round((imported / total) * 100));
    return (
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{t("import.live.progressTitle", { provider: job.provider })}</span>
            <Badge variant={badgeVariant(job.status)}>{job.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={pct} />
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Counter label={t("import.live.contacts")} value={job.imported_records.contacts ?? 0} />
            <Counter label={t("import.live.companies")} value={job.imported_records.companies ?? 0} />
            <Counter label={t("import.live.deals")} value={job.imported_records.deals ?? 0} />
          </div>
          {job.error_count > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t("import.live.errors", { count: job.error_count })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="size-5" />
            {t("import.live.title")}
          </DialogTitle>
          <DialogDescription>{t("import.live.description")}</DialogDescription>
        </DialogHeader>

        {loading && providers.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3">
            {providers.map((p) => (
              <Card key={p.id} className={!p.configured ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {p.label}
                    {p.connected ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <CheckCircle2 className="size-3" />
                        {t("import.live.connected")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <XCircle className="size-3" />
                        {t("import.live.notConnected")}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {!p.configured
                      ? t("import.live.notConfigured")
                      : p.connected
                      ? t("import.live.willImport")
                      : t("import.live.willConnect")}
                  </div>
                  <div className="flex gap-2">
                    {p.connected ? (
                      <Button
                        size="sm"
                        onClick={() => startImport(p.id)}
                        disabled={!!importingProvider || (activeJob !== null && activeJob.status === "running")}
                      >
                        {importingProvider === p.id ? (
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5 mr-1.5" />
                        )}
                        {t("import.live.import")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => startConnect(p.id)}
                        disabled={!p.configured}
                      >
                        <Plug className="size-3.5 mr-1.5" />
                        {t("import.live.connect")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeJob && renderProgress(activeJob)}
      </DialogContent>
    </Dialog>
  );
}

function sumCounts(map: Record<string, number> | undefined): number {
  if (!map) return 0;
  return Object.values(map).reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
}

function badgeVariant(status: ImportJob["status"]) {
  if (status === "completed") return "default" as const;
  if (status === "failed" || status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5 flex flex-col items-start">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

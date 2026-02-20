"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { Download, Loader2, Users, Handshake, Building2, ListTodo } from "lucide-react";

const ENTITIES = [
  { key: "contacts", icon: Users },
  { key: "deals", icon: Handshake },
  { key: "companies", icon: Building2 },
  { key: "tasks", icon: ListTodo },
] as const;

export function ExportSection() {
  const { t } = useTranslation();
  const [loadingEntity, setLoadingEntity] = useState<string | null>(null);

  const handleExport = async (entity: string) => {
    setLoadingEntity(entity);
    try {
      const res = await fetch(`/api/crm/export?entity=${entity}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.error === "No data to export") {
          toast.error(t("settings.export.noData"));
        } else {
          toast.error(json?.error || "Export failed");
        }
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || `${entity}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("settings.export.exported", { entity }));
    } catch {
      toast.error("Export failed");
    } finally {
      setLoadingEntity(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.export.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.export.description")}</p>
      </div>
      <Separator />

      <div className="grid gap-3 sm:grid-cols-2">
        {ENTITIES.map(({ key, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t(`settings.export.${key}`)}</p>
                <p className="text-xs text-muted-foreground">{t(`settings.export.${key}Description`)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(key)}
                disabled={loadingEntity !== null}
              >
                {loadingEntity === key ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

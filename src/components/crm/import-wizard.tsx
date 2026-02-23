"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function ImportWizard({ open, onOpenChange, onComplete }: ImportWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<Record<string, string>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; companies: number } | null>(null);

  const parseCsv = () => {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      toast.error(t("crm.import.headerRequired"));
      return;
    }

    if (lines.length > 1001) {
      toast.error(t("crm.import.maxRows"));
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

    const hasNameColumn = headers.some((h) => ["first_name", "name", "email"].includes(h));
    if (!hasNameColumn) {
      toast.error(t("crm.import.columnRequired"));
      return;
    }

    const rows = lines.slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });

    if (rows.length === 0) {
      toast.error(t("crm.import.noValidRows"));
      return;
    }

    setParsed(rows);
    setStep("preview");
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const contacts = parsed.map((row) => ({
        first_name: row.first_name || row.name?.split(" ")[0] || "Unknown",
        last_name: row.last_name || row.name?.split(" ").slice(1).join(" ") || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        title: row.title || row.job_title || undefined,
        company: row.company || row.company_name || undefined,
        source: "import",
      }));

      const res = await fetch("/api/crm/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      const json = await res.json();

      if (json.success) {
        setImportResult(json.data);
        setStep("done");
        toast.success(t("crm.import.imported", { count: json.data.imported }));
        onComplete?.();
      } else {
        toast.error(json.error || t("crm.import.failed"));
      }
    } catch {
      toast.error(t("crm.import.failed"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("paste");
      setCsv("");
      setParsed([]);
      setImportResult(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            {t("crm.import.title")}
          </DialogTitle>
        </DialogHeader>

        {step === "paste" && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("crm.import.csvHint")}
              </p>
              <Textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={`first_name,last_name,email,phone,company\nJohn,Doe,john@example.com,+1234567890,Acme Inc`}
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>{t("common.cancel")}</Button>
              <Button onClick={parseCsv} disabled={!csv.trim()}>{t("crm.import.preview")}</Button>
            </DialogFooter>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("crm.import.foundContacts", { count: parsed.length })}
              </p>
              <div className="max-h-60 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">{t("crm.import.name")}</th>
                      <th className="text-left p-2">{t("crm.import.email")}</th>
                      <th className="text-left p-2">{t("crm.import.company")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.first_name || row.name} {row.last_name || ""}</td>
                        <td className="p-2">{row.email || "-"}</td>
                        <td className="p-2">{row.company || row.company_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 20 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    {t("crm.import.andMore", { count: parsed.length - 20 })}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("paste")}>{t("crm.import.back")}</Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {t("crm.import.importCount", { count: parsed.length })}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && importResult && (
          <>
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
              <p className="text-lg font-medium">{t("crm.import.complete")}</p>
              <p className="text-sm text-muted-foreground">
                {t("crm.import.completeDescription", { imported: importResult.imported, companies: importResult.companies })}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{t("crm.import.done")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

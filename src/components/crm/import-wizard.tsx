"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import {
  IMPORT_TEMPLATES,
  autoMap,
  contactFields,
  leadFields,
  getTemplate,
  type ImportEntity,
} from "@/lib/crm/import-templates";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  // Defaults to contacts to preserve the original call sites.
  entity?: ImportEntity;
}

type Step = "source" | "upload" | "map" | "done";

type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

const MAX_ROWS = 1000;

function endpointFor(entity: ImportEntity): string {
  return entity === "leads" ? "/api/crm/import/leads" : "/api/crm/import";
}

function payloadKey(entity: ImportEntity): "contacts" | "leads" {
  return entity === "leads" ? "leads" : "contacts";
}

export function ImportWizard({ open, onOpenChange, onComplete, entity = "contacts" }: ImportWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("source");
  const [templateId, setTemplateId] = useState<string>("generic");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Array<string | null>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; companies?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const template = useMemo(() => getTemplate(templateId) ?? IMPORT_TEMPLATES[0]!, [templateId]);
  const fields = useMemo(
    () => (entity === "leads" ? leadFields() : contactFields()),
    [entity],
  );

  function reset() {
    setStep("source");
    setTemplateId("generic");
    setCsv(null);
    setMapping([]);
    setResult(null);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  function pickFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        if (res.errors?.length) {
          toast.error(res.errors[0]?.message || "CSV parse error");
          return;
        }
        const rows = res.data;
        const headers = res.meta.fields ?? [];
        if (!headers.length) {
          toast.error("CSV needs a header row");
          return;
        }
        if (rows.length === 0) {
          toast.error("CSV has no rows");
          return;
        }
        if (rows.length > MAX_ROWS) {
          toast.error(`Maximum ${MAX_ROWS} rows per import`);
          return;
        }
        setCsv({ headers, rows: rows as Record<string, string>[] });
        setMapping(autoMap(template, entity, headers));
        setStep("map");
      },
      error: (err: Error) => toast.error(err.message),
    });
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  async function handleImport() {
    if (!csv) return;
    setIsImporting(true);
    try {
      // Compose rows using the current mapping. If two source columns map to
      // the same Nexxus field, the rightmost wins (matches user overrides).
      const rows = csv.rows.map((source) => {
        const out: Record<string, string> = {};
        csv.headers.forEach((header, idx) => {
          const target = mapping[idx];
          if (!target) return;
          const value = source[header];
          if (value !== undefined && value !== "" && value !== null) {
            out[target] = String(value).trim();
          }
        });
        // Backfill first_name from a single "name" cell when the source CSV
        // only stores the full name.
        if (!out.first_name && source["name"]) {
          const parts = String(source["name"]).trim().split(/\s+/);
          out.first_name = parts[0] ?? "Unknown";
          if (parts.length > 1) out.last_name = parts.slice(1).join(" ");
        }
        if (!out.first_name) out.first_name = "Unknown";
        if (!out.source) out.source = `import:${template.id}`;
        return out;
      });

      const res = await fetch(endpointFor(entity), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [payloadKey(entity)]: rows }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Import failed");
        return;
      }
      setResult(json.data);
      setStep("done");
      toast.success(`Imported ${json.data.imported} ${entity}`);
      onComplete?.();
    } catch {
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  const sampleRows = csv?.rows.slice(0, 3) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            {t("crm.import.title")}
          </DialogTitle>
        </DialogHeader>

        {step === "source" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Pick the source you are migrating from. We&apos;ll auto-match columns to Nexxus fields; you can override on the next step.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {IMPORT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateId(tpl.id)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50 ${
                    templateId === tpl.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>{t("common.cancel")}</Button>
              <Button onClick={() => setStep("upload")}>Continue</Button>
            </DialogFooter>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file from <span className="font-medium text-foreground">{template.name}</span>. Maximum {MAX_ROWS} rows.
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <FileText className="size-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drop CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground">UTF-8, comma-separated, first row = headers</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("source")}>Back</Button>
            </DialogFooter>
          </div>
        )}

        {step === "map" && csv && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                Detected <span className="font-medium">{csv.rows.length}</span> rows · {csv.headers.length} columns
              </p>
              <Button size="sm" variant="ghost" onClick={() => setStep("upload")}>
                <X className="size-4" />
                Change file
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold w-1/3">Source column</th>
                    <th className="text-left p-2 font-semibold w-1/3">Maps to</th>
                    <th className="text-left p-2 font-semibold">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {csv.headers.map((header, idx) => (
                    <tr key={header} className="border-t border-border">
                      <td className="p-2 font-mono">{header}</td>
                      <td className="p-2">
                        <Select
                          value={mapping[idx] ?? "__skip__"}
                          onValueChange={(v) =>
                            setMapping((prev) => prev.map((m, i) => (i === idx ? (v === "__skip__" ? null : v) : m)))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">— skip —</SelectItem>
                            {fields.map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-muted-foreground truncate">
                        {sampleRows.map((r) => r[header]).filter(Boolean).join(" / ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!mapping.includes("first_name") && (
              <p className="text-xs text-amber-600">
                No column maps to <span className="font-mono">first_name</span>. Rows without a name will be imported as &quot;Unknown&quot;.
              </p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Import {csv.rows.length} rows
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="size-12 mx-auto text-emerald-500" />
            <div>
              <p className="text-sm font-semibold">Import complete</p>
              <p className="text-xs text-muted-foreground">
                {result.imported} {entity}
                {typeof result.companies === "number" ? ` · ${result.companies} companies created` : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>Import another file</Button>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

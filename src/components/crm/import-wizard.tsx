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

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function ImportWizard({ open, onOpenChange, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<Record<string, string>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; companies: number } | null>(null);

  const parseCsv = () => {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });

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
        toast.success(`Imported ${json.data.imported} contacts`);
        onComplete?.();
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
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
            Import Contacts
          </DialogTitle>
        </DialogHeader>

        {step === "paste" && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste CSV data with columns: first_name, last_name, email, phone, title, company
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
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={parseCsv} disabled={!csv.trim()}>Preview</Button>
            </DialogFooter>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Found {parsed.length} contact{parsed.length !== 1 ? "s" : ""} to import:
              </p>
              <div className="max-h-60 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Company</th>
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
                    ...and {parsed.length - 20} more
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("paste")}>Back</Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting && <Loader2 className="size-4 mr-2 animate-spin" />}
                Import {parsed.length} Contact{parsed.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && importResult && (
          <>
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
              <p className="text-lg font-medium">Import Complete</p>
              <p className="text-sm text-muted-foreground">
                {importResult.imported} contacts and {importResult.companies} companies imported.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

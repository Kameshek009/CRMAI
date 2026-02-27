"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

interface LostReason {
  id: string;
  label: string;
  is_active: boolean;
}

interface LostReasonDialogProps {
  open: boolean;
  onConfirm: (reasonId: string | null, note: string) => void;
  onCancel: () => void;
}

export function LostReasonDialog({ open, onConfirm, onCancel }: LostReasonDialogProps) {
  const { t } = useTranslation();
  const [reasons, setReasons] = useState<LostReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setNote("");
    setLoading(true);
    fetch("/api/crm/deal-lost-reasons")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setReasons((json.data || []).filter((r: LostReason) => r.is_active));
      })
      .finally(() => setLoading(false));
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("crm.pipeline.lostReasonTitle")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {reasons.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("crm.pipeline.selectReason")}</label>
                <div className="grid gap-2">
                  {reasons.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                      className={`rounded-lg border p-2.5 text-sm text-left transition-colors ${
                        selectedId === r.id
                          ? "border-primary bg-primary/5 font-medium"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("crm.pipeline.lostNote")}</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("crm.pipeline.lostNotePlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button onClick={() => onConfirm(selectedId, note)}>
            {t("crm.pipeline.confirmLost")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

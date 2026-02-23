"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCallTimer } from "@/contexts/call-timer-context";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function PostCallDialog() {
  const { t } = useTranslation();
  const { state, dismissPostCall } = useCallTimer();
  const [status, setStatus] = useState("completed");
  const [summary, setSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!state.callLogId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/crm/call-logs/${state.callLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          summary: summary || null,
          duration_seconds: state.elapsedSeconds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.callLogs.postCall.saved"));
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } catch {
      toast.error(t("common.failed"));
    } finally {
      setIsSaving(false);
      setStatus("completed");
      setSummary("");
      dismissPostCall();
    }
  };

  const handleSkip = () => {
    // Still update duration
    if (state.callLogId) {
      fetch(`/api/crm/call-logs/${state.callLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_seconds: state.elapsedSeconds }),
      }).catch(() => {});
    }
    setStatus("completed");
    setSummary("");
    dismissPostCall();
  };

  return (
    <Dialog open={state.showPostCall} onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("crm.callLogs.postCall.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              {state.contactName && (
                <p className="text-sm font-medium">{state.contactName}</p>
              )}
              <p className="text-xs text-muted-foreground">{state.phoneNumber}</p>
            </div>
            <p className="text-sm font-mono font-medium tabular-nums">
              {formatDuration(state.elapsedSeconds)}
            </p>
          </div>

          <div>
            <Label>{t("crm.callLogs.postCall.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">{t("crm.callLogs.statuses.completed")}</SelectItem>
                <SelectItem value="no_answer">{t("crm.callLogs.statuses.noAnswer")}</SelectItem>
                <SelectItem value="busy">{t("crm.callLogs.statuses.busy")}</SelectItem>
                <SelectItem value="voicemail">{t("crm.callLogs.statuses.voicemail")}</SelectItem>
                <SelectItem value="cancelled">{t("crm.callLogs.statuses.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("crm.callLogs.postCall.summary")}</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("crm.callLogs.postCall.summaryPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            {t("crm.callLogs.postCall.skip")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            {t("crm.callLogs.postCall.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

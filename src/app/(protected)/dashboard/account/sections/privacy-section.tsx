"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Loader2, AlertTriangle, Trash2, Cookie } from "lucide-react";
import { openCookiePreferences } from "@/components/cookie-consent/banner";
import { DELETION_GRACE_DAYS } from "@/lib/gdpr/config";

type Status = {
  deletion_requested_at: string | null;
  email: string;
};

export function PrivacySection() {
  const { signOut } = useClerk();
  const [status, setStatus] = useState<Status | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function loadStatus() {
    try {
      const res = await fetch("/api/account/profile");
      const json = await res.json();
      if (json.success) {
        setStatus({
          deletion_requested_at: json.data.deletion_requested_at,
          email: json.data.email ?? "",
        });
      }
    } catch {
      // non-fatal — UI just hides scheduled-deletion banner
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const daysUntilPurge = (() => {
    if (!status?.deletion_requested_at) return null;
    const requested = new Date(status.deletion_requested_at).getTime();
    const purgeAt = requested + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const days = Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
    return days;
  })();

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/account/export", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        "nexxus-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setDownloading(false);
    }
  }

  async function handleRequestDelete() {
    setDeleteSubmitting(true);
    try {
      const res = await fetch("/api/account/delete-request", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.error === "transfer_ownership_required") {
          const teams = (json.blocking_teams ?? []).map((t: { team_name: string }) => t.team_name).join(", ");
          toast.error(`Transfer ownership of: ${teams}`);
        } else {
          toast.error(json.error || "Failed to schedule deletion");
        }
        return;
      }
      toast.success(`Deletion scheduled. You can cancel within ${json.grace_period_days} days.`);
      setDeleteOpen(false);
      setEmailConfirm("");
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      toast.error("Failed to schedule deletion");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleCancelDelete() {
    setCancelling(true);
    try {
      const res = await fetch("/api/account/delete-cancel", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Deletion cancelled");
        await loadStatus();
      } else {
        toast.error(json.error || "Failed to cancel");
      }
    } catch {
      toast.error("Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  const emailMatches = emailConfirm.trim().toLowerCase() === status?.email.toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Privacy &amp; GDPR</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Exercise your data rights: download a full copy of your data or permanently delete your account.
        </p>
      </div>
      <Separator />

      {daysUntilPurge !== null && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                Account scheduled for permanent deletion in {daysUntilPurge}{" "}
                {daysUntilPurge === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cancel before the grace period expires to keep your data.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleCancelDelete} disabled={cancelling}>
              {cancelling ? <Loader2 className="size-4 animate-spin" /> : "Cancel deletion"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Download my data</p>
            <p className="text-xs text-muted-foreground">
              A single JSON file with all data tied to your account. Limited to one export per 24 hours.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : "Download"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Cookie className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Cookie preferences</p>
            <p className="text-xs text-muted-foreground">
              Manage what categories of cookies Nexxus may set on your device.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={openCookiePreferences}>
            Manage
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="size-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Delete my account permanently</p>
            <p className="text-xs text-muted-foreground">
              Schedules a hard delete after a {DELETION_GRACE_DAYS}-day grace period. Owned teams must be empty or transferred first.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={daysUntilPurge !== null}
            onClick={() => setDeleteOpen(true)}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account permanently</DialogTitle>
            <DialogDescription>
              Your account and all data you own will be irrecoverably removed after {DELETION_GRACE_DAYS} days.
              You can cancel within that window. Type your email to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="email-confirm" className="text-sm">
              Type <span className="font-mono text-foreground">{status?.email}</span> to confirm
            </Label>
            <Input
              id="email-confirm"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!emailMatches || deleteSubmitting}
              onClick={handleRequestDelete}
            >
              {deleteSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Schedule deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

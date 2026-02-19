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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: "contact" | "deal" | "lead";
  entityId?: string;
  defaultTo?: string;
  defaultFrom?: string;
  onSent?: () => void;
}

export function EmailComposer({
  open,
  onOpenChange,
  entityType,
  entityId,
  defaultTo,
  defaultFrom,
  onSent,
}: EmailComposerProps) {
  const [to, setTo] = useState(defaultTo || "");
  const [from, setFrom] = useState(defaultFrom || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !from.trim()) {
      toast.error("To and From are required");
      return;
    }

    setIsSending(true);
    try {
      const payload: Record<string, unknown> = {
        from_email: from.trim(),
        to_emails: to.split(",").map(e => e.trim()).filter(Boolean),
        subject: subject.trim(),
        body_text: body.trim(),
        direction: "outbound",
        status: "sent",
      };
      if (entityType && entityId) {
        payload[`${entityType}_id`] = entityId;
      }

      const res = await fetch("/api/crm/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Email logged");
        setTo(defaultTo || "");
        setSubject("");
        setBody("");
        onOpenChange(false);
        onSent?.();
      } else {
        toast.error(json.error || "Failed to send email");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base">Compose Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">From</Label>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

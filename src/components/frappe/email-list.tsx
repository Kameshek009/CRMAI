"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen, Send, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  subject: string | null;
  body_text: string | null;
  from_email: string;
  to_emails: string[];
  direction: string;
  status: string;
  created_at: string;
}

interface EmailListProps {
  entityType: "contact" | "deal" | "lead";
  entityId: string;
  onCompose?: () => void;
}

export function EmailList({ entityType, entityId, onCompose }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/crm/emails?${entityType}_id=${entityId}&limit=50`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setEmails(json.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [entityType, entityId]);

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Loading emails...</div>;
  }

  return (
    <div className="space-y-4">
      {onCompose && (
        <Button variant="outline" size="sm" onClick={onCompose}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Compose
        </Button>
      )}

      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No emails yet</p>
      ) : (
        <div className="space-y-2">
          {emails.map(email => {
            const isExpanded = expanded === email.id;
            return (
              <div
                key={email.id}
                className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : email.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    {email.direction === "outbound"
                      ? <Send className="h-4 w-4 text-blue-500" />
                      : email.status === "received"
                        ? <MailOpen className="h-4 w-4 text-muted-foreground" />
                        : <Mail className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{email.subject || "(no subject)"}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(email.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {email.direction === "outbound" ? `To: ${email.to_emails.join(", ")}` : `From: ${email.from_email}`}
                    </p>
                    {!isExpanded && email.body_text && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{email.body_text}</p>
                    )}
                    {isExpanded && email.body_text && (
                      <p className="text-sm whitespace-pre-wrap mt-2 text-foreground">{email.body_text}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0 capitalize">{email.status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

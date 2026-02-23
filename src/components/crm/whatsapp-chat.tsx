"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Check, CheckCheck, Clock, AlertCircle, Settings, MessageSquare } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import { WhatsAppTemplatePicker } from "./whatsapp-template-picker";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import Link from "next/link";

interface WhatsAppMessage {
  id: string;
  wa_message_id: string | null;
  from_number: string;
  to_number: string;
  content: string | null;
  message_type: string;
  direction: string;
  status: string;
  template_name: string | null;
  created_at: string;
}

interface WhatsAppChatProps {
  entityType: "contact" | "lead";
  entityId: string;
  phoneNumber?: string | null;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

export function WhatsAppChat({ entityType, entityId, phoneNumber }: WhatsAppChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(() => {
    fetch(`/api/crm/whatsapp/messages?${entityType}_id=${entityId}&limit=100`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMessages(json.data);
      })
      .catch(() => {});
  }, [entityType, entityId]);

  // Check if WhatsApp is configured
  useEffect(() => {
    fetch("/api/crm/whatsapp/settings")
      .then((r) => r.json())
      .then((json) => {
        setIsConfigured(json.success && json.data !== null);
      })
      .catch(() => setIsConfigured(false));
  }, []);

  // Load messages
  useEffect(() => {
    if (isConfigured === false) {
      setIsLoading(false);
      return;
    }
    if (isConfigured === null) return;

    setIsLoading(true);
    fetchMessages();
    setIsLoading(false);

    // Poll every 15s
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [isConfigured, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !phoneNumber || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/crm/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_number: phoneNumber,
          content: newMessage.trim(),
          message_type: "text",
          [`${entityType}_id`]: entityId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewMessage("");
        toast.success(t("crm.whatsapp.messageSent"));
        fetchMessages();
      } else {
        toast.error(json.error || t("crm.whatsapp.messageFailed"));
      }
    } catch {
      toast.error(t("crm.whatsapp.messageFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleTemplateSend = async (templateName: string, params: string[]) => {
    if (!phoneNumber) return;

    setIsSending(true);
    setShowTemplatePicker(false);
    try {
      const res = await fetch("/api/crm/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_number: phoneNumber,
          message_type: "template",
          template_name: templateName,
          template_params: params,
          [`${entityType}_id`]: entityId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.whatsapp.messageSent"));
        fetchMessages();
      } else {
        toast.error(json.error || t("crm.whatsapp.messageFailed"));
      }
    } catch {
      toast.error(t("crm.whatsapp.messageFailed"));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        {t("crm.whatsapp.loading")}
      </div>
    );
  }

  if (isConfigured === false) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("crm.whatsapp.notConfigured")}</p>
        <p className="text-xs text-muted-foreground">{t("crm.whatsapp.configureHint")}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/account">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            {t("crm.whatsapp.goToSettings")}
          </Link>
        </Button>
      </div>
    );
  }

  if (!phoneNumber) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("crm.whatsapp.noMessages")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("crm.whatsapp.noMessages")}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            return (
              <div
                key={msg.id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isOutbound
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.template_name && (
                    <Badge variant="secondary" className="text-[10px] mb-1">
                      {t("crm.whatsapp.template")}: {msg.template_name}
                    </Badge>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content || `[${msg.message_type}]`}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
                    <TimeAgo
                      date={msg.created_at}
                      className={`text-[10px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    />
                    {isOutbound && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Template picker */}
      {showTemplatePicker && (
        <WhatsAppTemplatePicker
          onSelect={handleTemplateSend}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Composer */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
          >
            {t("crm.whatsapp.template")}
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("crm.whatsapp.messagePlaceholder")}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            disabled={!newMessage.trim() || isSending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

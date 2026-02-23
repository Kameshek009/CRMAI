"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallTimer } from "@/contexts/call-timer-context";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClickToCallProps {
  phoneNumber: string;
  contactId?: string;
  leadId?: string;
  dealId?: string;
  contactName?: string;
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

export function ClickToCall({
  phoneNumber,
  contactId,
  leadId,
  dealId,
  contactName,
  variant = "icon",
  size = "sm",
}: ClickToCallProps) {
  const { t } = useTranslation();
  const { state, startCall } = useCallTimer();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (state.isActive) return;

    // Open native dialer
    window.open(`tel:${phoneNumber}`);

    // Create call log
    try {
      const res = await fetch("/api/crm/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "outbound",
          status: "initiated",
          to_number: phoneNumber,
          contact_id: contactId || null,
          deal_id: dealId || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        startCall({
          callLogId: json.data.id,
          phoneNumber,
          contactName,
        });
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={state.isActive}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors",
          size === "sm" ? "h-7 w-7" : "h-9 w-9",
          state.isActive && "opacity-50 cursor-not-allowed"
        )}
        title={t("crm.callLogs.clickToCall")}
      >
        <Phone className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleClick}
      disabled={state.isActive}
      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
    >
      <Phone className="size-3.5 mr-1.5" />
      {t("crm.callLogs.clickToCall")}
    </Button>
  );
}

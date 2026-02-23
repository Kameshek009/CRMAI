"use client";

import { Phone, PhoneOff, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallTimer } from "@/contexts/call-timer-context";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallTimerPopup() {
  const { t } = useTranslation();
  const { state, endCall } = useCallTimer();
  const [minimized, setMinimized] = useState(false);

  if (!state.isActive) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <Phone className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-mono font-medium tabular-nums">
            {formatTime(state.elapsedSeconds)}
          </span>
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("crm.callLogs.callTimer.title")}
          </span>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-4 text-center space-y-3">
        <div className={cn(
          "inline-flex items-center justify-center rounded-full p-3",
          "bg-emerald-100 dark:bg-emerald-900/30"
        )}>
          <Phone className="h-6 w-6 text-emerald-600" />
        </div>

        {state.contactName && (
          <p className="text-sm font-semibold">{state.contactName}</p>
        )}
        <p className="text-xs text-muted-foreground">{state.phoneNumber}</p>

        <p className="text-3xl font-mono font-bold tabular-nums">
          {formatTime(state.elapsedSeconds)}
        </p>

        <Button
          variant="destructive"
          size="sm"
          onClick={endCall}
          className="w-full"
        >
          <PhoneOff className="size-3.5 mr-1.5" />
          {t("crm.callLogs.callTimer.endCall")}
        </Button>
      </div>
    </div>
  );
}

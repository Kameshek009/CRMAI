"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Monitor, Smartphone, Globe } from "lucide-react";

interface LoginEntry {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

function parseUserAgent(ua: string | null): { browser: string; device: string } {
  if (!ua) return { browser: "Unknown", device: "desktop" };

  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";

  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
  return { browser, device };
}

export function LoginHistorySection() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/account/login-history");
      const json = await res.json();
      if (json.success) setEntries(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.loginHistory.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.loginHistory.description")}</p>
      </div>
      <Separator />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("settings.loginHistory.noHistory")}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const { browser, device } = parseUserAgent(entry.user_agent);
            const DeviceIcon = device === "mobile" ? Smartphone : Monitor;
            const location = [entry.city, entry.country].filter(Boolean).join(", ");

            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-3">
                <DeviceIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{browser}</span>
                    {idx === 0 && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                        {t("settings.loginHistory.current")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                    {entry.ip_address && <span className="font-mono">{entry.ip_address}</span>}
                    {location && (
                      <span className="flex items-center gap-1">
                        <Globe className="size-3" />
                        {location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

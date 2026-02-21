"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const POPULAR_CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "\u20AC" },
  { code: "GBP", symbol: "\u00A3" },
  { code: "RUB", symbol: "\u20BD" },
  { code: "KZT", symbol: "\u20B8" },
  { code: "JPY", symbol: "\u00A5" },
  { code: "CNY", symbol: "\u00A5" },
  { code: "TRY", symbol: "\u20BA" },
  { code: "INR", symbol: "\u20B9" },
  { code: "BRL", symbol: "R$" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "CHF", symbol: "Fr" },
  { code: "AED", symbol: "\u062F.\u0625" },
];

interface CurrencyRate {
  id: string;
  currency_code: string;
  rate_to_usd: number;
  symbol: string;
  updated_at: string;
}

export function CurrenciesSection() {
  const { t } = useTranslation();
  const { currentWorkspace, can } = useWorkspace();
  const teamId = currentWorkspace?.id;
  const canManage = can("team_settings.manage");

  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [savingBase, setSavingBase] = useState(false);

  const [addCode, setAddCode] = useState("");
  const [addRate, setAddRate] = useState("");
  const [addSymbol, setAddSymbol] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchRates = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/currencies`);
      const json = await res.json();
      if (json.success) setRates(json.data || []);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/teams/${teamId}`);
    const json = await res.json();
    if (json.success && json.data?.default_currency) {
      setBaseCurrency(json.data.default_currency);
    }
  }, [teamId]);

  useEffect(() => {
    fetchRates();
    fetchTeam();
  }, [fetchRates, fetchTeam]);

  const handleSaveBase = async () => {
    if (!teamId) return;
    setSavingBase(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_currency: baseCurrency }),
      });
      const json = await res.json();
      if (json.success) toast.success(t("settings.currencies.saved"));
      else toast.error(json.error);
    } finally {
      setSavingBase(false);
    }
  };

  const handleAdd = async () => {
    if (!teamId || !addCode || !addRate) return;
    const found = POPULAR_CURRENCIES.find((c) => c.code === addCode.toUpperCase());
    setAdding(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/currencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency_code: addCode.toUpperCase(),
          rate_to_usd: Number(addRate),
          symbol: addSymbol || found?.symbol || addCode.toUpperCase(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.currencies.saved"));
        setAddCode("");
        setAddRate("");
        setAddSymbol("");
        fetchRates();
      } else {
        toast.error(json.error);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!teamId) return;
    const res = await fetch(`/api/teams/${teamId}/currencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency_code: code }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("settings.currencies.deleted"));
      fetchRates();
    } else {
      toast.error(json.error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.currencies.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.currencies.description")}</p>
      </div>
      <Separator />

      {/* Base currency */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("settings.currencies.baseCurrency")}</label>
        <div className="flex gap-2 items-center">
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            disabled={!canManage}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {POPULAR_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
          {canManage && (
            <Button size="sm" onClick={handleSaveBase} disabled={savingBase}>
              {savingBase && <Loader2 className="size-4 animate-spin mr-1" />}
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Rates list */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("settings.currencies.exchangeRates")}</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("settings.currencies.noRates")}</p>
        ) : (
          <div className="space-y-2">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {r.currency_code}
                  </Badge>
                  <span className="text-sm">{r.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    1 USD = {r.rate_to_usd} {r.currency_code}
                  </span>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(r.currency_code)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add currency */}
      {canManage && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t("settings.currencies.addCurrency")}</h3>
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("settings.currencies.code")}</label>
                <select
                  value={addCode}
                  onChange={(e) => {
                    setAddCode(e.target.value);
                    const found = POPULAR_CURRENCIES.find((c) => c.code === e.target.value);
                    if (found) setAddSymbol(found.symbol);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("settings.currencies.selectCurrency")}</option>
                  {POPULAR_CURRENCIES.filter((c) => !rates.some((r) => r.currency_code === c.code)).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("settings.currencies.rateToUSD")}</label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={addRate}
                  onChange={(e) => setAddRate(e.target.value)}
                  placeholder="1.0"
                  className="w-32"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("settings.currencies.symbol")}</label>
                <Input
                  value={addSymbol}
                  onChange={(e) => setAddSymbol(e.target.value)}
                  placeholder="$"
                  className="w-20"
                />
              </div>
              <Button size="sm" onClick={handleAdd} disabled={adding || !addCode || !addRate}>
                {adding ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
                {t("settings.currencies.add")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

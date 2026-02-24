"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { useAccount } from "@/contexts/account-context";
import { toast } from "sonner";
import { Copy, Webhook, MessageSquare, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface WhatsAppSettings {
  phone_number_id: string;
  waba_id: string;
  access_token_masked: string;
  webhook_verify_token: string;
  is_connected: boolean;
}

export function IntegrationsSection() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { account } = useAccount();

  // WhatsApp state
  const [waSettings, setWaSettings] = useState<WhatsAppSettings | null>(null);
  const [waForm, setWaForm] = useState({
    phone_number_id: "",
    waba_id: "",
    access_token: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [waLoaded, setWaLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/crm/whatsapp/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setWaSettings(json.data);
          setWaForm({
            phone_number_id: json.data.phone_number_id || "",
            waba_id: json.data.waba_id || "",
            access_token: "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setWaLoaded(true));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("settings.integrations.copied"));
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : "";

  const handleSaveWhatsApp = async () => {
    if (!waForm.phone_number_id || !waForm.waba_id) return;

    setIsSaving(true);
    try {
      const body: Record<string, string> = {
        phone_number_id: waForm.phone_number_id,
        waba_id: waForm.waba_id,
      };
      // Only send token if user entered a new one
      if (waForm.access_token) {
        body.access_token = waForm.access_token;
      } else if (waSettings?.access_token_masked) {
        // Keep existing token — don't send empty
        // The API should handle this, but we skip sending
      }
      // If no existing token and no new token → require it
      if (!waForm.access_token && !waSettings?.access_token_masked) {
        toast.error(t("settings.integrations.whatsapp.accessTokenRequired"));
        setIsSaving(false);
        return;
      }

      const res = await fetch("/api/crm/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.integrations.whatsapp.saved"));
        // Reload settings
        const reloadRes = await fetch("/api/crm/whatsapp/settings");
        const reloadJson = await reloadRes.json();
        if (reloadJson.success && reloadJson.data) {
          setWaSettings(reloadJson.data);
          setWaForm((prev) => ({ ...prev, access_token: "" }));
        }
      } else {
        toast.error(json.error || t("settings.integrations.whatsapp.saveFailed"));
      }
    } catch {
      toast.error(t("settings.integrations.whatsapp.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/crm/whatsapp/test-connection", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.integrations.whatsapp.connectionSuccess", { name: json.data.name }));
        setWaSettings((prev) => prev ? { ...prev, is_connected: true } : prev);
      } else {
        toast.error(t("settings.integrations.whatsapp.connectionFailed", { error: json.error }));
      }
    } catch {
      toast.error(t("settings.integrations.whatsapp.connectionFailed", { error: t("settings.integrations.networkError") }));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.integrations.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.integrations.description")}</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.integrations.apiAccess")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.integrations.apiAccessDescription")}</p>

          {currentWorkspace && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("settings.integrations.teamId")}</p>
                <p className="text-sm font-mono">{currentWorkspace.id}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => copyToClipboard(currentWorkspace.id)}>
                <Copy className="size-4" />
              </Button>
            </div>
          )}

          {account && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("settings.integrations.accountId")}</p>
                <p className="text-sm font-mono">{account.id}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => copyToClipboard(account.id)}>
                <Copy className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Business */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4" />
            {t("settings.integrations.whatsapp.title")}
            {waLoaded && waSettings && (
              waSettings.is_connected
                ? <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="size-3" />{t("settings.integrations.whatsapp.connected")}</Badge>
                : <Badge variant="secondary" className="text-xs gap-1"><XCircle className="size-3" />{t("settings.integrations.whatsapp.notConnected")}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("settings.integrations.whatsapp.description")}</p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.integrations.whatsapp.phoneNumberId")}</Label>
              <Input
                value={waForm.phone_number_id}
                onChange={(e) => setWaForm((prev) => ({ ...prev, phone_number_id: e.target.value }))}
                placeholder="123456789012345"
              />
              <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.phoneNumberIdHelp")}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.integrations.whatsapp.wabaId")}</Label>
              <Input
                value={waForm.waba_id}
                onChange={(e) => setWaForm((prev) => ({ ...prev, waba_id: e.target.value }))}
                placeholder="123456789012345"
              />
              <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.wabaIdHelp")}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.integrations.whatsapp.accessToken")}</Label>
              <div className="flex gap-2">
                <Input
                  type={showToken ? "text" : "password"}
                  value={waForm.access_token}
                  onChange={(e) => setWaForm((prev) => ({ ...prev, access_token: e.target.value }))}
                  placeholder={waSettings?.access_token_masked || "EAAxxxxxxx..."}
                />
                <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.accessTokenHelp")}</p>
            </div>

            {/* Read-only fields after save */}
            {waSettings?.webhook_verify_token && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.webhookVerifyToken")}</p>
                  <p className="text-sm font-mono">{waSettings.webhook_verify_token}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => copyToClipboard(waSettings.webhook_verify_token)}>
                  <Copy className="size-4" />
                </Button>
              </div>
            )}

            {webhookUrl && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.webhookUrl")}</p>
                  <p className="text-sm font-mono break-all">{webhookUrl}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(webhookUrl)}>
                  <Copy className="size-4" />
                </Button>
              </div>
            )}
            {webhookUrl && (
              <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.webhookUrlHelp")}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveWhatsApp} disabled={isSaving || !waForm.phone_number_id || !waForm.waba_id}>
              {isSaving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {t("settings.integrations.whatsapp.save")}
            </Button>
            {waSettings && (
              <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {isTesting ? t("settings.integrations.whatsapp.testing") : t("settings.integrations.whatsapp.testConnection")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="size-4" />
            {t("settings.integrations.webhooks")}
            <Badge variant="secondary" className="text-xs">{t("settings.integrations.comingSoonBadge")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("settings.integrations.comingSoon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

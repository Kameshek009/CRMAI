"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Copy, Webhook, MessageSquare, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

interface WhatsAppSettings {
  phone_number_id: string;
  waba_id: string;
  access_token_masked: string | null;
  app_secret_set: boolean;
  webhook_verify_token: string;
  is_connected: boolean;
  origin: "byo" | "embedded_signup";
  display_name: string | null;
  needs_resave: boolean;
}

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  provider_user_id?: string;
  email?: string | null;
  name?: string | null;
  scopes?: string[];
  connected_at?: string | null;
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
    app_secret: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [waLoaded, setWaLoaded] = useState(false);
  const [waEmbeddedConfigured, setWaEmbeddedConfigured] = useState(false);

  // Google integration state
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const loadGoogleStatus = () => {
    fetch("/api/oauth/google/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setGoogleStatus(json.data as GoogleStatus);
      })
      .catch(() => {})
      .finally(() => setGoogleLoaded(true));
  };

  useEffect(() => {
    loadGoogleStatus();
  }, []);

  // Toast on return from OAuth flow
  useEffect(() => {
    const status = searchParams.get("google_oauth");
    if (!status) return;
    if (status === "connected") {
      toast.success(t("settings.integrations.google.connected"));
    } else {
      const msg = searchParams.get("google_oauth_message") || "";
      toast.error(t("settings.integrations.google.connectFailed", { error: msg || "unknown" }));
    }
    // Clear the params so reload doesn't re-toast
    const params = new URLSearchParams(searchParams.toString());
    params.delete("google_oauth");
    params.delete("google_oauth_message");
    const next = params.toString();
    router.replace(next ? `?${next}` : "?tab=integrations");
    loadGoogleStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnectGoogle = () => {
    setGoogleBusy(true);
    window.location.href = "/api/oauth/google/start?return_to=/dashboard/account?tab=integrations";
  };

  const handleDisconnectGoogle = async () => {
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/oauth/google/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.integrations.google.disconnectSuccess"));
        setGoogleStatus((prev) => prev ? { ...prev, connected: false, email: null, name: null } : prev);
      } else {
        toast.error(json.error || t("settings.integrations.google.disconnectFailed"));
      }
    } catch {
      toast.error(t("settings.integrations.google.disconnectFailed"));
    } finally {
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    fetch("/api/oauth/whatsapp/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setWaEmbeddedConfigured(Boolean(json.data.embedded_signup_configured));
        }
      })
      .catch(() => {});
  }, []);

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
            app_secret: "",
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
      }
      // App secret is optional — only send if user typed one
      if (waForm.app_secret) {
        body.app_secret = waForm.app_secret;
      }
      // Plaintext-migrated rows REQUIRE a fresh access_token; mask is shown
      // as legacy and we don't reuse it.
      const hasUsableExisting =
        waSettings?.access_token_masked &&
        !waSettings.needs_resave;
      if (!waForm.access_token && !hasUsableExisting) {
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
          setWaForm((prev) => ({ ...prev, access_token: "", app_secret: "" }));
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

      {/* Google (Gmail + Calendar) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="size-4" />
            {t("settings.integrations.google.title")}
            {googleLoaded && googleStatus && (
              googleStatus.connected
                ? <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="size-3" />{t("settings.integrations.google.connected")}</Badge>
                : <Badge variant="secondary" className="text-xs gap-1"><XCircle className="size-3" />{t("settings.integrations.google.notConnected")}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("settings.integrations.google.description")}</p>
          <p className="text-xs text-muted-foreground">{t("settings.integrations.google.scopesIncluded")}</p>

          {googleStatus && !googleStatus.configured && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              {t("settings.integrations.google.notConfigured")}
            </div>
          )}

          {googleStatus?.connected && googleStatus.email && (
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm">{t("settings.integrations.google.connectedAs", { email: googleStatus.email })}</p>
              {googleStatus.connected_at && (
                <p className="text-xs text-muted-foreground">
                  {t("settings.integrations.google.connectedSince", { date: new Date(googleStatus.connected_at).toLocaleString() })}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!googleStatus?.connected ? (
              <Button
                onClick={handleConnectGoogle}
                disabled={googleBusy || Boolean(googleStatus && !googleStatus.configured)}
              >
                {googleBusy && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {googleBusy ? t("settings.integrations.google.connecting") : t("settings.integrations.google.connect")}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDisconnectGoogle} disabled={googleBusy}>
                {googleBusy && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {googleBusy ? t("settings.integrations.google.disconnecting") : t("settings.integrations.google.disconnect")}
              </Button>
            )}
          </div>
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

          <div className="rounded-md border bg-muted/40 p-3 flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">{t("settings.integrations.whatsapp.tabEmbedded")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {waEmbeddedConfigured
                  ? t("settings.integrations.whatsapp.origin.embedded_signup")
                  : t("settings.integrations.whatsapp.connectViaMetaUnavailable")}
              </p>
            </div>
            <Button
              variant="default"
              disabled={!waEmbeddedConfigured}
              onClick={() => {
                window.location.href = "/api/oauth/whatsapp/start?return_to=/dashboard/account?tab=integrations";
              }}
            >
              {t("settings.integrations.whatsapp.connectViaMeta")}
            </Button>
          </div>

          <div className="text-xs uppercase tracking-wide text-muted-foreground pt-2">
            {t("settings.integrations.whatsapp.tabBYO")}
          </div>

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

            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-2">
                {t("settings.integrations.whatsapp.appSecret")}
                {waLoaded && waSettings && (
                  waSettings.app_secret_set
                    ? <Badge variant="default" className="text-xs">{t("settings.integrations.whatsapp.appSecretSet")}</Badge>
                    : <Badge variant="secondary" className="text-xs">{t("settings.integrations.whatsapp.appSecretNotSet")}</Badge>
                )}
              </Label>
              <Input
                type="password"
                value={waForm.app_secret}
                onChange={(e) => setWaForm((prev) => ({ ...prev, app_secret: e.target.value }))}
                placeholder={waSettings?.app_secret_set ? "•••••••• (set)" : "..."}
              />
              <p className="text-xs text-muted-foreground">{t("settings.integrations.whatsapp.appSecretHelp")}</p>
            </div>

            {waSettings?.needs_resave && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                {t("settings.integrations.whatsapp.needsResave")}
              </div>
            )}

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

"use client";

import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { useAccount } from "@/contexts/account-context";
import { toast } from "sonner";
import { Copy, Webhook } from "lucide-react";

export function IntegrationsSection() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { account } = useAccount();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("settings.integrations.copied"));
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="size-4" />
            {t("settings.integrations.webhooks")}
            <Badge variant="secondary" className="text-xs">Soon</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("settings.integrations.comingSoon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

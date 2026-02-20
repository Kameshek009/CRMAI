"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { ExternalLink } from "lucide-react";

export function SecuritySection() {
  const { t } = useTranslation();
  const { user } = useUser();
  const clerk = useClerk();

  const email = user?.emailAddresses?.[0]?.emailAddress || "—";
  const lastSignIn = user?.lastSignInAt
    ? new Date(user.lastSignInAt).toLocaleString()
    : "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.security.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.security.description")}</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.security.loginInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("settings.security.email")}</span>
            <span className="text-sm font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("settings.security.lastSignIn")}</span>
            <span className="text-sm font-medium">{lastSignIn}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.security.manageSecurity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.security.manageSecurityDescription")}
          </p>
          <Button variant="outline" onClick={() => clerk.openUserProfile()}>
            <ExternalLink className="size-4 mr-2" />
            {t("settings.security.openSecuritySettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

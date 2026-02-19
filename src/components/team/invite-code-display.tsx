"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface InviteCodeDisplayProps {
  code: string;
  teamId: string;
  canRegenerate?: boolean;
  onRegenerate?: (newCode: string) => void;
}

export function InviteCodeDisplay({ code, teamId, canRegenerate = false, onRegenerate }: InviteCodeDisplayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("team.overview.inviteCodeCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/invite-code/regenerate`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.overview.inviteCodeRegenerated"));
        onRegenerate?.(json.data.invite_code);
      } else {
        toast.error(json.error || t("team.overview.failedRegenerate"));
      }
    } catch {
      toast.error(t("team.overview.failedRegenerate"));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted px-3 py-2 rounded-md text-sm font-mono tracking-wider select-all">
        {code}
      </code>
      <Button variant="ghost" size="icon" className="size-8" onClick={handleCopy}>
        {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
      </Button>
      {canRegenerate && (
        <Button variant="ghost" size="icon" className="size-8" onClick={handleRegenerate} disabled={regenerating}>
          <RefreshCw className={`size-4 ${regenerating ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
}

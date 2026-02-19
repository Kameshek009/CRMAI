"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CustomerBillingCard, InvoiceHistory } from "@/components/billing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, Crown, Settings, CreditCard, AlertTriangle, ArrowRight, Palette, Users, Plus, Pencil } from "lucide-react";
import { ThemeToggleSlider } from "@/components/theme-toggle-slider";
import { TeamCreateWizard } from "@/components/team/team-create-wizard";
import { useWorkspace } from "@/contexts/team-context";
import { toast } from "sonner";
import type { UsageStats } from "@/types";
import type { CustomerBillingInfoData, InvoiceInfo } from "@/components/billing";

interface AccountContentProps {
  email: string;
  name: string;
  imageUrl: string;
}

interface TeamInfo {
  id: string;
  name: string;
  tier: string;
  seatCount: number;
  isDirector: boolean;
}

interface BillingData {
  team: TeamInfo;
  usageStats: UsageStats;
  paymentHistory: unknown[];
  stripeBilling: CustomerBillingInfoData | null;
}

function getTierInfo(tier: string): { name: string; variant: "default" | "secondary" | "outline" } {
  switch (tier) {
    case "free":
      return { name: "Free", variant: "secondary" };
    case "pro":
      return { name: "Pro", variant: "default" };
    case "max":
      return { name: "Max", variant: "default" };
    case "enterprise":
      return { name: "Enterprise", variant: "default" };
    default:
      return { name: tier, variant: "secondary" };
  }
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(0)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`;
  }
  return count.toLocaleString();
}

function JoinTeamForm({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    maxMembers: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/teams/join/validate?code=${encodeURIComponent(code.trim())}`);
      const json = await res.json();
      if (json.success) {
        setPreview(json.data);
      } else {
        toast.error(json.error || "Invalid code");
      }
    } catch {
      toast.error("Failed to validate code");
    } finally {
      setValidating(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Joined ${json.data.teamName}!`);
        onJoined();
      } else {
        toast.error(json.error || "Failed to join");
      }
    } catch {
      toast.error("Failed to join team");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-code">Invite Code</Label>
        <div className="flex gap-2">
          <Input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter invite code"
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          />
          <Button onClick={handleValidate} disabled={validating || !code.trim()} variant="secondary">
            {validating ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
          </Button>
        </div>
      </div>

      {preview && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{preview.name}</h3>
                {preview.description && (
                  <p className="text-sm text-muted-foreground">{preview.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {preview.memberCount} / {preview.maxMembers} members
                </p>
              </div>
              <Button onClick={handleJoin} disabled={joining}>
                {joining ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRight className="size-4 mr-2" />}
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WorkspaceCard() {
  const { currentWorkspace, workspaces, refetch } = useWorkspace();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Workspace
        </CardTitle>
        <CardDescription>
          {currentWorkspace
            ? `Current workspace: ${currentWorkspace.name}`
            : "You are not in a workspace yet"}
          {workspaces.length > 1 && ` (${workspaces.length} workspaces total)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="join" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join" className="gap-2">
              <ArrowRight className="size-4" />
              Join Workspace
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Plus className="size-4" />
              Create Workspace
            </TabsTrigger>
          </TabsList>
          <TabsContent value="join" className="mt-4">
            <JoinTeamForm onJoined={refetch} />
          </TabsContent>
          <TabsContent value="create" className="mt-4">
            <TeamCreateWizard />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function AccountContent({ email, name: initialName, imageUrl }: AccountContentProps) {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    async function fetchBillingData() {
      try {
        const response = await fetch("/api/billing/account");
        const data = await response.json();

        if (data.success) {
          setBillingData(data.data);
        } else {
          setError(data.error || "Failed to load billing data");
        }
      } catch (err) {
        setError("Failed to load billing data");
        console.error("Error fetching billing data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBillingData();
  }, []);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) {
      setEditingName(false);
      setNameInput(displayName);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        setDisplayName(trimmed);
        setEditingName(false);
        toast.success("Name updated");
      } else {
        toast.error(json.error || "Failed to update name");
      }
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const tierInfo = billingData ? getTierInfo(billingData.team.tier) : null;
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <PageContainer>
      <PageHeader
        title="Account Settings"
        description="Manage your profile and subscription"
      />

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            Profile
          </CardTitle>
          <CardDescription>
            Your display name is visible to team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={imageUrl} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameInput(displayName);
                      }
                    }}
                    className="h-8 max-w-[240px]"
                    autoFocus
                    disabled={savingName}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={savingName || !nameInput.trim()}
                  >
                    {savingName ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(displayName);
                    }}
                    disabled={savingName}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-medium">{displayName}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setNameInput(displayName);
                      setEditingName(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how NexusCRM looks for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggleSlider />
          </div>
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Subscription
          </CardTitle>
          <CardDescription>
            Your current plan and usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              <p className="text-sm">{error}</p>
            </div>
          ) : billingData && tierInfo ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold">{tierInfo.name}</span>
                  {tierInfo.name !== "Free" && (
                    <Crown className="size-4 text-yellow-500" />
                  )}
                  <Badge variant="outline" className="ml-1">
                    <Check className="mr-1 size-3" />
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {billingData.team.tier === "enterprise"
                    ? "Unlimited tokens (credit-based)"
                    : `${formatTokens(billingData.usageStats.tokenLimit)} tokens per month`}
                </p>
              </div>
              {billingData.team.tier === "free" && (
                <Button asChild>
                  <Link href="/dashboard/account/billing">
                    Upgrade
                    <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Button>
              )}
              {billingData.team.tier !== "free" && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/account/billing">
                    Manage Plan
                  </Link>
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Billing Details (from Stripe) */}
      {!isLoading && billingData && (
        <CustomerBillingCard
          billingInfo={billingData.stripeBilling}
          isLoading={isLoading}
        />
      )}

      {/* Invoice History (from Stripe) */}
      {!isLoading && billingData?.stripeBilling?.invoices && (
        <InvoiceHistory
          invoices={billingData.stripeBilling.invoices as InvoiceInfo[]}
          isLoading={isLoading}
        />
      )}

      {/* Team */}
      <WorkspaceCard />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

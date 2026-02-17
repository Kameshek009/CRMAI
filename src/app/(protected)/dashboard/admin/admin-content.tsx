"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  RefreshCw,
  Shield,
  Users,
  RotateCcw,
  Pencil,
  Plus,
  Loader2,
} from "lucide-react";
import type { SubscriptionTier } from "@/types";

interface AdminUser {
  id: string;
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  tier: SubscriptionTier;
  tokenLimit: number;
  tokensUsed: number;
  weeklyTokensUsed: number;
  tokenCredits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

type DialogType = "token_limit" | "add_credits" | null;

const tierColors: Record<SubscriptionTier, string> = {
  free: "bg-secondary text-foreground",
  pro: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  max: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  enterprise: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function formatTokens(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toLocaleString();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogUserId, setDialogUserId] = useState<string | null>(null);
  const [dialogValue, setDialogValue] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast.error(data.error || "Failed to load users");
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const performAction = async (
    accountId: string,
    action: string,
    value: string | number
  ) => {
    try {
      setActionLoading(accountId);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action, value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === "change_tier"
            ? `Plan changed to ${value}`
            : action === "reset_usage"
              ? "Usage reset"
              : action === "set_token_limit"
                ? `Token limit set to ${formatTokens(Number(value))}`
                : `Added ${formatTokens(Number(value))} credits`
        );
        await fetchUsers();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTierChange = (accountId: string, tier: string) => {
    performAction(accountId, "change_tier", tier);
  };

  const handleResetUsage = (accountId: string) => {
    performAction(accountId, "reset_usage", "");
  };

  const openDialog = (type: DialogType, userId: string) => {
    setDialogType(type);
    setDialogUserId(userId);
    setDialogValue("");
  };

  const handleDialogSubmit = () => {
    if (!dialogUserId || !dialogType || !dialogValue) return;
    const action =
      dialogType === "token_limit" ? "set_token_limit" : "add_credits";
    performAction(dialogUserId, action, Number(dialogValue));
    setDialogType(null);
  };

  // Stats
  const totalUsers = users.length;
  const tierCounts = users.reduce(
    (acc, u) => {
      acc[u.tier] = (acc[u.tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const getUserName = (user: AdminUser) => {
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    return user.email || user.clerkUserId.slice(0, 12);
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Admin Panel" description="Manage users and plans" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Admin Panel" description="Manage users and plans">
        <Badge variant="outline" className="gap-1.5">
          <Shield className="size-3" />
          Admin
        </Badge>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {(["free", "pro", "max", "enterprise"] as SubscriptionTier[]).map(
          (tier) => (
            <Card key={tier}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Badge className={tierColors[tier]}>{tier}</Badge>
                  <p className="text-2xl font-bold">{tierCounts[tier] || 0}</p>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({totalUsers})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Tokens Used</TableHead>
                  <TableHead>Token Limit</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isActioning = actionLoading === user.id;
                  return (
                    <TableRow key={user.id}>
                      {/* User info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.imageUrl ? (
                            <img
                              src={user.imageUrl}
                              alt=""
                              className="size-8 rounded-full"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                              {getUserName(user).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {getUserName(user)}
                            </p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Tier select */}
                      <TableCell>
                        <Select
                          value={user.tier}
                          onValueChange={(v) => handleTierChange(user.id, v)}
                          disabled={isActioning}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="max">Max</SelectItem>
                            <SelectItem value="enterprise">
                              Enterprise
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Tokens used */}
                      <TableCell>
                        <span className="text-sm">
                          {formatTokens(user.tokensUsed)}
                        </span>
                      </TableCell>

                      {/* Token limit */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {formatTokens(user.tokenLimit)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => openDialog("token_limit", user.id)}
                            disabled={isActioning}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Credits */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {formatTokens(user.tokenCredits)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => openDialog("add_credits", user.id)}
                            disabled={isActioning}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Joined */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetUsage(user.id)}
                          disabled={isActioning}
                        >
                          {isActioning ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1.5 size-3.5" />
                          )}
                          Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={dialogType !== null}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "token_limit"
                ? "Set Token Limit"
                : "Add Credits"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder={
                dialogType === "token_limit"
                  ? "e.g. 1000000"
                  : "e.g. 100000"
              }
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {dialogValue &&
                Number(dialogValue) > 0 &&
                `= ${formatTokens(Number(dialogValue))} tokens`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDialogSubmit}
              disabled={!dialogValue || Number(dialogValue) <= 0}
            >
              {dialogType === "token_limit" ? "Set Limit" : "Add Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

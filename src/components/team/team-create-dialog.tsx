"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { Loader2, Search, X } from "lucide-react";

interface AccountOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function TeamCreateDialog({ open, onOpenChange, onCreated }: TeamCreateDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { workspaces } = useWorkspace();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentTeamId, setParentTeamId] = useState<string | undefined>(undefined);
  const [selectedMembers, setSelectedMembers] = useState<AccountOption[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AccountOption[]>([]);
  const [searching, setSearching] = useState(false);

  const [creating, setCreating] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setParentTeamId(undefined);
      setSelectedMembers([]);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Search accounts with debounce
  const searchAccounts = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/accounts/search?q=${encodeURIComponent(query)}&limit=20`);
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data);
      }
    } catch {
      // Silently fail search
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAccounts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAccounts]);

  const toggleMember = (account: AccountOption) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === account.id);
      if (exists) {
        return prev.filter((m) => m.id !== account.id);
      }
      return [...prev, account];
    });
  };

  const removeMember = (accountId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== accountId));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t("team.createDialog.nameRequired"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          parentTeamId: parentTeamId === "none" ? undefined : parentTeamId || undefined,
          memberIds: selectedMembers.map((m) => m.id),
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(t("team.createDialog.created"));
        onOpenChange(false);
        onCreated?.();
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(json.error || t("team.createDialog.failedCreate"));
      }
    } catch {
      toast.error(t("team.createDialog.failedCreate"));
    } finally {
      setCreating(false);
    }
  };

  // Parent team options — only teams the user owns
  const parentTeamOptions = workspaces
    .filter((w) => w.isOwner)
    .map((w) => ({ id: w.workspace.id, name: w.workspace.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("team.createDialog.title")}</DialogTitle>
          <DialogDescription>{t("team.createDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team name */}
          <div className="space-y-2">
            <Label htmlFor="team-name">{t("team.createDialog.teamName")} *</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("team.createDialog.namePlaceholder")}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="team-desc">{t("team.createDialog.descriptionLabel")}</Label>
            <Textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("team.createDialog.descriptionPlaceholder")}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Parent team */}
          {parentTeamOptions.length > 0 && (
            <div className="space-y-2">
              <Label>{t("team.createDialog.parentTeam")}</Label>
              <Select value={parentTeamId} onValueChange={setParentTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("team.createDialog.parentTeamPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("team.createDialog.noParent")}
                  </SelectItem>
                  {parentTeamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Members multi-select */}
          <div className="space-y-2">
            <Label>{t("team.createDialog.members")}</Label>

            {/* Selected members as badges */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((member) => (
                  <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
                    {member.name || member.email || t("team.createDialog.unnamed")}
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("team.createDialog.searchUsers")}
                className="pl-9"
              />
            </div>

            {/* Search results */}
            {(searchResults.length > 0 || searching) && (
              <ScrollArea className="h-[150px] border rounded-md">
                <div className="p-2 space-y-1">
                  {searching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : (
                    searchResults.map((account) => {
                      const isSelected = selectedMembers.some((m) => m.id === account.id);
                      return (
                        <label
                          key={account.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMember(account)}
                          />
                          <span className="truncate">
                            {account.name || t("team.createDialog.unnamed")}
                          </span>
                          {account.email && (
                            <span className="text-muted-foreground text-xs truncate ml-auto">
                              {account.email}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("team.createDialog.creating")}
              </>
            ) : (
              t("team.createDialog.createTeam")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

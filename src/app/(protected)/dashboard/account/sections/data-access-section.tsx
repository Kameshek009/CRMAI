"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";

interface VGroup {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  entity_types: string[];
  rule_type: string;
  visibility_group_members: { id: string; account_id: string }[];
}

interface TeamMember {
  id: string;
  account_id: string;
  accounts: { id: string; name: string; email: string } | null;
}

const ENTITY_OPTIONS = ["contacts", "companies", "deals"];

export function DataAccessSection() {
  const { t } = useTranslation();
  const { currentWorkspace, can } = useWorkspace();
  const canManage = can("team_settings.manage");

  const [groups, setGroups] = useState<VGroup[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/visibility-groups");
      const json = await res.json();
      if (json.success) setGroups(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/members`);
    const json = await res.json();
    if (json.success) setMembers(json.data || []);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchGroups();
    fetchMembers();
  }, [fetchGroups, fetchMembers]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/crm/visibility-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.dataAccess.saved"));
        setNewName("");
        fetchGroups();
      } else {
        toast.error(json.error);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteGroupId) return;
    try {
      const res = await fetch(`/api/crm/visibility-groups/${deleteGroupId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.dataAccess.deleted"));
        fetchGroups();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error(t("common.failed"));
    } finally {
      setDeleteGroupId(null);
    }
  };

  const handleUpdateGroup = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/crm/visibility-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.success) fetchGroups();
    else toast.error(json.error);
  };

  const handleAddMember = async (groupId: string, accountId: string) => {
    const res = await fetch(`/api/crm/visibility-groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId }),
    });
    const json = await res.json();
    if (json.success) fetchGroups();
    else toast.error(json.error);
  };

  const handleRemoveMember = async (groupId: string, accountId: string) => {
    const res = await fetch(`/api/crm/visibility-groups/${groupId}/members?account_id=${accountId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) fetchGroups();
    else toast.error(json.error);
  };

  const toggleEntityType = (group: VGroup, entity: string) => {
    const current = group.entity_types || [];
    const updated = current.includes(entity)
      ? current.filter((e) => e !== entity)
      : [...current, entity];
    handleUpdateGroup(group.id, { entity_types: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.dataAccess.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.dataAccess.description")}</p>
      </div>
      <Separator />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          <Eye className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("settings.dataAccess.noGroups")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedId === group.id;
            const groupMembers = group.visibility_group_members || [];
            const nonMembers = members.filter(
              (m) => !groupMembers.some((gm) => gm.account_id === m.account_id)
            );

            return (
              <div key={group.id} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : group.id)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  {group.rule_type === "include" ? (
                    <Eye className="size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <EyeOff className="size-4 text-amber-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{group.name}</span>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    <Users className="size-3 mr-1" />
                    {groupMembers.length}
                  </Badge>
                  <div className="flex gap-1">
                    {(group.entity_types || []).map((et) => (
                      <Badge key={et} variant="secondary" className="text-[10px]">{et}</Badge>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-4">
                    <Separator />

                    {/* Rule type */}
                    {canManage && (
                      <div className="flex items-center gap-3">
                        <label className="text-sm">{t("settings.dataAccess.ruleType")}:</label>
                        <select
                          value={group.rule_type}
                          onChange={(e) => handleUpdateGroup(group.id, { rule_type: e.target.value })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="include">{t("settings.dataAccess.include")}</option>
                          <option value="exclude">{t("settings.dataAccess.exclude")}</option>
                        </select>
                      </div>
                    )}

                    {/* Entity types */}
                    {canManage && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{t("settings.dataAccess.entityTypes")}:</span>
                        {ENTITY_OPTIONS.map((et) => (
                          <label key={et} className="flex items-center gap-1.5 text-sm">
                            <Switch
                              checked={(group.entity_types || []).includes(et)}
                              onCheckedChange={() => toggleEntityType(group, et)}
                            />
                            {et}
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Members */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">{t("settings.dataAccess.members")}</span>
                      {groupMembers.length > 0 ? (
                        <div className="space-y-1">
                          {groupMembers.map((gm) => {
                            const member = members.find((m) => m.account_id === gm.account_id);
                            return (
                              <div key={gm.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-1.5">
                                <span className="text-sm">
                                  {member?.accounts?.name || member?.accounts?.email || gm.account_id.slice(0, 8)}
                                </span>
                                {canManage && (
                                  <Button variant="ghost" size="icon" className="size-6" onClick={() => handleRemoveMember(group.id, gm.account_id)}>
                                    <Trash2 className="size-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("settings.dataAccess.noMembers")}</p>
                      )}

                      {canManage && nonMembers.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleAddMember(group.id, e.target.value);
                            e.target.value = "";
                          }}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          defaultValue=""
                        >
                          <option value="">{t("settings.dataAccess.addMember")}</option>
                          {nonMembers.map((m) => (
                            <option key={m.account_id} value={m.account_id}>
                              {m.accounts?.name || m.accounts?.email || m.account_id.slice(0, 8)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {canManage && (
                      <Button variant="destructive" size="sm" onClick={() => setDeleteGroupId(group.id)}>
                        <Trash2 className="size-4 mr-1" />
                        {t("settings.dataAccess.deleteGroup")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create group */}
      {canManage && (
        <>
          <Separator />
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("settings.dataAccess.groupNamePlaceholder")}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
              {t("settings.dataAccess.createGroup")}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteGroupId}
        onOpenChange={(open) => { if (!open) setDeleteGroupId(null); }}
        title={t("settings.dataAccess.deleteGroupTitle")}
        description={t("settings.dataAccess.deleteGroupConfirm")}
        confirmLabel={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

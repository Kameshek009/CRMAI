"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoleBadge } from "@/components/team/role-badge";
import { RoleEditor } from "@/components/team/role-editor";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import {
  FIXED_ROLE_LABELS,
  FIXED_ROLE_COLORS,
  FIXED_ROLE_PERMISSIONS,
  FIXED_ROLE_PRIORITIES,
  type WorkspacePermissions,
  type FixedRole,
} from "@/types/team";

interface RoleData {
  id: string;
  name: string;
  color: string;
  priority: number;
  permissions: WorkspacePermissions;
  is_system: boolean;
}

export function RolesSection() {
  const { t } = useTranslation();
  const { currentWorkspace, isOwner, usesFixedRoles } = useWorkspace();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/roles`);
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
  }, [currentWorkspace]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleDeleteRole = async () => {
    if (!currentWorkspace || !deleteRoleId) return;
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}/roles/${deleteRoleId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.roles.deleted"));
        fetchRoles();
      } else {
        toast.error(json.error || t("team.roles.failedDelete"));
      }
    } catch {
      toast.error(t("common.failed"));
    } finally {
      setDeleteRoleId(null);
    }
  };

  const getPermissionSummary = (permissions: WorkspacePermissions) => {
    const canDo: string[] = [];
    if (permissions.contacts?.create) canDo.push(t("team.roles.permissions.createContacts"));
    if (permissions.deals?.create) canDo.push(t("team.roles.permissions.createDeals"));
    if (permissions.pipeline?.manage) canDo.push(t("team.roles.permissions.managePipeline"));
    if (permissions.team_settings?.manage) canDo.push(t("team.roles.permissions.manageWorkspace"));
    if (canDo.length === 0) canDo.push(t("team.roles.permissions.readOnly"));
    return canDo.join(", ");
  };

  if (usesFixedRoles) {
    const fixedRoles: FixedRole[] = ["owner", "admin", "member", "viewer"];
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{t("team.roles.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("team.roles.fixedDescription")}</p>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          {fixedRoles.map((role) => (
            <Card key={role}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="size-4" style={{ color: FIXED_ROLE_COLORS[role] }} />
                  <CardTitle className="text-sm font-semibold">{FIXED_ROLE_LABELS[role]}</CardTitle>
                </div>
                <RoleBadge name={`P${FIXED_ROLE_PRIORITIES[role]}`} color={FIXED_ROLE_COLORS[role]} />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{getPermissionSummary(FIXED_ROLE_PERMISSIONS[role])}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  <span>{t("team.roles.builtIn")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("team.roles.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("team.roles.customDescription")}</p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-2" /> {t("team.roles.createRole")}
          </Button>
        )}
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.filter((role) => role.name !== "AI").map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="size-4" style={{ color: role.color }} />
                <CardTitle className="text-sm font-semibold">{role.name}</CardTitle>
                {role.is_system && (
                  <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{t("team.roles.system")}</span>
                )}
              </div>
              <RoleBadge name={`P${role.priority}`} color={role.color} />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">{getPermissionSummary(role.permissions)}</p>
              {isOwner && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingRole(role)}>
                    <Pencil className="size-3 mr-1" /> {t("team.roles.edit")}
                  </Button>
                  {!role.is_system && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteRoleId(role.id)}>
                      <Trash2 className="size-3 mr-1" /> {t("common.delete")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {currentWorkspace && (
        <>
          <RoleEditor open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)} teamId={currentWorkspace.id} role={editingRole ? { ...editingRole, isSystem: editingRole.is_system } : undefined} onSaved={fetchRoles} />
          <RoleEditor open={showCreate} onOpenChange={setShowCreate} teamId={currentWorkspace.id} onSaved={fetchRoles} />
        </>
      )}

      <ConfirmDialog
        open={!!deleteRoleId}
        onOpenChange={(open) => { if (!open) setDeleteRoleId(null); }}
        title={t("team.roles.deleteTitle")}
        description={t("team.roles.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="destructive"
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}

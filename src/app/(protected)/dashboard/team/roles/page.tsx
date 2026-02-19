"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/team/role-badge";
import { RoleEditor } from "@/components/team/role-editor";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
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

export default function TeamRolesPage() {
  const { currentWorkspace, isOwner, usesFixedRoles } = useWorkspace();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/roles`);
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDeleteRole = async (roleId: string) => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/roles/${roleId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Role deleted");
      fetchRoles();
    } else {
      toast.error(json.error || "Failed to delete");
    }
  };

  const getPermissionSummary = (permissions: WorkspacePermissions) => {
    const canDo: string[] = [];
    if (permissions.contacts?.create) canDo.push("Create contacts");
    if (permissions.deals?.create) canDo.push("Create deals");
    if (permissions.pipeline?.manage) canDo.push("Manage pipeline");
    if (permissions.team_settings?.manage) canDo.push("Manage workspace");
    if (canDo.length === 0) canDo.push("Read only");
    return canDo.join(", ");
  };

  // For Free/Pro: show fixed roles as read-only cards
  if (usesFixedRoles) {
    const fixedRoles: FixedRole[] = ["owner", "admin", "member", "viewer"];

    return (
      <PageContainer>
        <PageHeader title="Roles" description="Fixed roles for your plan. Upgrade to Max for custom roles.">
          <RoleBadge name="Fixed" color="#6b7280" />
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <p className="text-xs text-muted-foreground mb-3">
                  {getPermissionSummary(FIXED_ROLE_PERMISSIONS[role])}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  <span>Built-in role</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  // For Max/Enterprise: full custom roles management
  return (
    <PageContainer>
      <PageHeader title="Roles" description="Manage workspace roles and permissions">
        {isOwner && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-2" /> Create Role
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="size-4" style={{ color: role.color }} />
                <CardTitle className="text-sm font-semibold">{role.name}</CardTitle>
                {role.is_system && (
                  <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">System</span>
                )}
              </div>
              <RoleBadge name={`P${role.priority}`} color={role.color} />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                {getPermissionSummary(role.permissions)}
              </p>
              {isOwner && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingRole(role)}
                  >
                    <Pencil className="size-3 mr-1" /> Edit
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      <Trash2 className="size-3 mr-1" /> Delete
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
          <RoleEditor
            open={!!editingRole}
            onOpenChange={(open) => !open && setEditingRole(null)}
            teamId={currentWorkspace.id}
            role={editingRole ? {
              ...editingRole,
              isSystem: editingRole.is_system,
            } : undefined}
            onSaved={fetchRoles}
          />
          <RoleEditor
            open={showCreate}
            onOpenChange={setShowCreate}
            teamId={currentWorkspace.id}
            onSaved={fetchRoles}
          />
        </>
      )}
    </PageContainer>
  );
}

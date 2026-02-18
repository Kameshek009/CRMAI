"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeam } from "@/contexts/team-context";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/team/role-badge";
import { RoleEditor } from "@/components/team/role-editor";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import type { TeamPermissions } from "@/types/team";

interface RoleData {
  id: string;
  name: string;
  color: string;
  priority: number;
  permissions: TeamPermissions;
  is_system: boolean;
}

export default function TeamRolesPage() {
  const { currentTeam, isDirector } = useTeam();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/roles`);
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
  }, [currentTeam]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDeleteRole = async (roleId: string) => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/roles/${roleId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Role deleted");
      fetchRoles();
    } else {
      toast.error(json.error || "Failed to delete");
    }
  };

  const getPermissionSummary = (permissions: TeamPermissions) => {
    const canDo: string[] = [];
    if (permissions.contacts?.create) canDo.push("Create contacts");
    if (permissions.deals?.create) canDo.push("Create deals");
    if (permissions.pipeline?.manage) canDo.push("Manage pipeline");
    if (permissions.team_settings?.manage) canDo.push("Manage team");
    if (canDo.length === 0) canDo.push("Read only");
    return canDo.join(", ");
  };

  return (
    <PageContainer>
      <PageHeader title="Roles" description="Manage team roles and permissions">
        {isDirector && (
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
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">System</span>
                )}
              </div>
              <RoleBadge name={`P${role.priority}`} color={role.color} />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                {getPermissionSummary(role.permissions)}
              </p>
              {isDirector && (
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

      {currentTeam && (
        <>
          <RoleEditor
            open={!!editingRole}
            onOpenChange={(open) => !open && setEditingRole(null)}
            teamId={currentTeam.id}
            role={editingRole ? {
              ...editingRole,
              isSystem: editingRole.is_system,
            } : undefined}
            onSaved={fetchRoles}
          />
          <RoleEditor
            open={showCreate}
            onOpenChange={setShowCreate}
            teamId={currentTeam.id}
            onSaved={fetchRoles}
          />
        </>
      )}
    </PageContainer>
  );
}

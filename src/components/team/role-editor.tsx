"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { TeamPermissions } from "@/types/team";

interface RoleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  role?: {
    id: string;
    name: string;
    color: string;
    priority: number;
    permissions: TeamPermissions;
    isSystem: boolean;
  };
  onSaved: () => void;
}

const RESOURCE_LABELS: Record<string, string> = {
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  tasks: "Tasks",
  pipeline: "Pipeline",
  analytics: "Analytics",
  team_settings: "Team Settings",
  ai_chat: "AI Chat",
};

const ACTION_LABELS: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  manage: "Manage",
  allowed: "Allowed",
};

const DEFAULT_PERMISSIONS: TeamPermissions = {
  contacts: { read: true, create: true, update: true, delete: false },
  companies: { read: true, create: true, update: false, delete: false },
  deals: { read: true, create: true, update: true, delete: false },
  tasks: { read: true, create: true, update: true, delete: false },
  call_logs: { read: true, create: true, update: true, delete: false },
  notes: { read: true, create: true, update: true, delete: false },
  leads: { read: true, create: true, update: true, delete: false },
  pipeline: { read: true, manage: false },
  analytics: { read: true },
  team_settings: { read: false, manage: false },
  ai_chat: { allowed: true },
};

export function RoleEditor({ open, onOpenChange, teamId, role, onSaved }: RoleEditorProps) {
  const isNew = !role;
  const [name, setName] = useState(role?.name || "");
  const [color, setColor] = useState(role?.color || "#6b7280");
  const [priority, setPriority] = useState(role?.priority || 100);
  const [permissions, setPermissions] = useState<TeamPermissions>(
    role?.permissions || DEFAULT_PERMISSIONS
  );
  const [saving, setSaving] = useState(false);

  const togglePermission = (resource: string, action: string) => {
    setPermissions((prev) => {
      const resourcePerms = { ...(prev[resource as keyof TeamPermissions] as Record<string, boolean>) };
      resourcePerms[action] = !resourcePerms[action];
      return { ...prev, [resource]: resourcePerms };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isNew
        ? `/api/teams/${teamId}/roles`
        : `/api/teams/${teamId}/roles/${role!.id}`;

      const body = isNew
        ? { name, color, priority, permissions }
        : { ...(role!.isSystem ? {} : { name }), color, permissions };

      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isNew ? "Role created" : "Role updated");
        onSaved();
        onOpenChange(false);
      } else {
        toast.error(json.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create Role" : `Edit ${role?.name}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(!role?.isSystem || isNew) && (
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Rep" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
              </div>
            </div>
            {isNew && (
              <div className="space-y-2">
                <Label>Priority (1-899)</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  min={1}
                  max={899}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Permissions</Label>
            {Object.entries(permissions).map(([resource, actions]) => (
              <div key={resource} className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">
                  {RESOURCE_LABELS[resource] || resource}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {Object.entries(actions as Record<string, boolean>).map(([action, value]) => (
                    <label key={action} className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={value}
                        onCheckedChange={() => togglePermission(resource, action)}
                      />
                      {ACTION_LABELS[action] || action}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (!isNew && !name)}>
            {saving ? "Saving..." : isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

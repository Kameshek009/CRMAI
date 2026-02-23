"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";

interface LostReason {
  id: string;
  label: string;
  position: number;
  is_active: boolean;
}

export function LostReasonsSection() {
  const { t } = useTranslation();
  const [reasons, setReasons] = useState<LostReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchReasons = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/deal-lost-reasons");
      const json = await res.json();
      if (json.success) setReasons(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReasons(); }, [fetchReasons]);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/crm/deal-lost-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), position: reasons.length }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.lostReasons.saved"));
        setNewLabel("");
        fetchReasons();
      } else {
        toast.error(json.error);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    try {
      const res = await fetch(`/api/crm/deal-lost-reasons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      const json = await res.json();
      if (json.success) fetchReasons();
      else toast.error(json.error);
    } catch {
      toast.error(t("common.failed"));
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editLabel.trim()) return;
    const res = await fetch(`/api/crm/deal-lost-reasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim() }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("settings.lostReasons.saved"));
      setEditingId(null);
      fetchReasons();
    } else {
      toast.error(json.error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/crm/deal-lost-reasons/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.lostReasons.deleted"));
        fetchReasons();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error(t("common.failed"));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.lostReasons.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.lostReasons.description")}</p>
      </div>
      <Separator />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : reasons.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t("settings.lostReasons.noReasons")}</p>
      ) : (
        <div className="space-y-2">
          {reasons.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3 group">
              {editingId === r.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(r.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => handleSaveEdit(r.id)}>
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditingId(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">{r.label}</span>
                    {!r.is_active && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {t("settings.lostReasons.inactive")}
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => handleToggle(r.id, v)}
                  />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditingId(r.id); setEditLabel(r.label); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-red-600 hover:text-red-700" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={t("settings.lostReasons.placeholder")}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <Button onClick={handleAdd} disabled={adding || !newLabel.trim()}>
          {adding ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
          {t("settings.lostReasons.add")}
        </Button>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t("settings.lostReasons.deleteTitle")}
        description={t("settings.lostReasons.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

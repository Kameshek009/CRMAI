"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/crm/empty-state";
import { SequenceBuilder } from "@/components/crm/sequence-builder";
import { Plus, Mail, Users, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

interface Sequence {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  step_count: number;
  active_enrollments: number;
  total_enrollments: number;
  created_at: string;
}

export function SequencesContent() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/sequences");
      const json = await res.json();
      if (json.success) setSequences(json.data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const handleToggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/crm/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    const json = await res.json();
    if (json.success) {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s))
      );
      toast.success(isActive ? "Sequence activated" : "Sequence paused");
    } else {
      toast.error(json.error || "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/crm/sequences/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setSequences((prev) => prev.filter((s) => s.id !== id));
      toast.success("Sequence deleted");
    } else {
      toast.error(json.error || "Failed to delete");
    }
  };

  const handleCreated = () => {
    setShowBuilder(false);
    fetchSequences();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Email Sequences" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Email Sequences"
        description="Automate email campaigns with timed follow-ups"
      >
        <Button size="sm" onClick={() => setShowBuilder(true)}>
          <Plus className="size-3.5 mr-1.5" />
          New Sequence
        </Button>
      </PageHeader>

      {sequences.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No sequences yet"
          description="Create your first email sequence to automate follow-ups."
          actionLabel="Create Sequence"
          onAction={() => setShowBuilder(true)}
        />
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <Card key={seq.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Mail className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{seq.name}</h3>
                        <Badge variant={seq.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {seq.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3" />
                          {seq.step_count} steps
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {seq.active_enrollments} active / {seq.total_enrollments} total
                        </span>
                        <span className="capitalize">{seq.trigger_type.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={seq.is_active}
                      onCheckedChange={(checked) => handleToggle(seq.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(seq.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SequenceBuilder
        open={showBuilder}
        onOpenChange={setShowBuilder}
        onCreated={handleCreated}
      />
    </PageContainer>
  );
}

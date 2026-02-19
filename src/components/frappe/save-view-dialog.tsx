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

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    label: string;
    is_public: boolean;
    is_pinned: boolean;
  }) => Promise<void>;
  defaultLabel?: string;
}

export function SaveViewDialog({ open, onOpenChange, onSave, defaultLabel }: SaveViewDialogProps) {
  const [label, setLabel] = useState(defaultLabel || "");
  const [isPublic, setIsPublic] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ label: label.trim(), is_public: isPublic, is_pinned: isPinned });
      onOpenChange(false);
      setLabel("");
      setIsPublic(false);
      setIsPinned(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">Save View</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="view-name" className="text-sm">Name</Label>
            <Input
              id="view-name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My View"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="view-public" className="text-sm">Public (visible to team)</Label>
            <Switch id="view-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="view-pinned" className="text-sm">Pin to sidebar</Label>
            <Switch id="view-pinned" checked={isPinned} onCheckedChange={setIsPinned} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!label.trim() || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

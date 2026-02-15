"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function TeamCreateWizard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Team created!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(json.error || "Failed to create team");
      }
    } catch {
      toast.error("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-name">Team Name</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sales Team"
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-desc">Description (optional)</Label>
        <Textarea
          id="team-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this team do?"
          maxLength={500}
          rows={3}
        />
      </div>
      <Button onClick={handleCreate} disabled={creating || !name.trim()} className="w-full">
        {creating ? "Creating..." : "Create Team"}
      </Button>
    </div>
  );
}

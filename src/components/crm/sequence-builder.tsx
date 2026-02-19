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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowDown, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

interface Step {
  delay_days: number;
  subject: string;
  body: string;
}

interface SequenceBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function SequenceBuilder({ open, onOpenChange, onCreated }: SequenceBuilderProps) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    { delay_days: 0, subject: "", body: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStep = () => {
    setSteps([...steps, { delay_days: 1, subject: "", body: "" }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof Step, value: string | number) => {
    setSteps(
      steps.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Sequence name is required");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }
    if (steps.some((s) => !s.subject.trim())) {
      toast.error("All steps need a subject");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create sequence
      const seqRes = await fetch("/api/crm/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const seqJson = await seqRes.json();
      if (!seqJson.success) {
        toast.error(seqJson.error || "Failed to create sequence");
        return;
      }

      const sequenceId = seqJson.data.id;

      // Create steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await fetch(`/api/crm/sequences/${sequenceId}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position: i,
            delay_days: step.delay_days,
            subject: step.subject.trim(),
            body: step.body.trim(),
          }),
        });
      }

      toast.success("Sequence created");
      setName("");
      setSteps([{ delay_days: 0, subject: "", body: "" }]);
      onCreated();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Create Email Sequence</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Sequence name */}
          <div className="space-y-2">
            <Label className="text-sm">Sequence Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome Series"
              maxLength={200}
            />
          </div>

          {/* Steps */}
          <div className="space-y-1">
            <Label className="text-sm">Steps</Label>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <ArrowDown className="size-3 text-muted-foreground" />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>Wait</span>
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          value={step.delay_days}
                          onChange={(e) => updateStep(index, "delay_days", parseInt(e.target.value) || 0)}
                          className="w-16 h-6 text-xs text-center"
                        />
                        <span>day{step.delay_days !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Mail className="size-3" />
                        Step {index + 1}
                      </span>
                      {steps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={step.subject}
                      onChange={(e) => updateStep(index, "subject", e.target.value)}
                      placeholder="Email subject"
                      className="text-sm"
                      maxLength={500}
                    />
                    <Textarea
                      value={step.body}
                      onChange={(e) => updateStep(index, "body", e.target.value)}
                      placeholder="Email body..."
                      rows={3}
                      className="text-sm"
                      maxLength={10000}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={addStep}
            >
              <Plus className="size-3.5 mr-1.5" />
              Add Step
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

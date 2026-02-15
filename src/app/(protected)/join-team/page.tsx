"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamCreateWizard } from "@/components/team/team-create-wizard";
import { Users, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function JoinTeamForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    maxMembers: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/teams/join/validate?code=${encodeURIComponent(code.trim())}`);
      const json = await res.json();
      if (json.success) {
        setPreview(json.data);
      } else {
        toast.error(json.error || "Invalid code");
      }
    } catch {
      toast.error("Failed to validate code");
    } finally {
      setValidating(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Joined ${json.data.teamName}!`);
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(json.error || "Failed to join");
      }
    } catch {
      toast.error("Failed to join team");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-code">Invite Code</Label>
        <div className="flex gap-2">
          <Input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter invite code"
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          />
          <Button onClick={handleValidate} disabled={validating || !code.trim()} variant="secondary">
            {validating ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
          </Button>
        </div>
      </div>

      {preview && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{preview.name}</h3>
                {preview.description && (
                  <p className="text-sm text-muted-foreground">{preview.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {preview.memberCount} / {preview.maxMembers} members
                </p>
              </div>
              <Button onClick={handleJoin} disabled={joining}>
                {joining ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRight className="size-4 mr-2" />}
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Get Started</CardTitle>
          <CardDescription>
            Join an existing team or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="join" className="gap-2">
                <ArrowRight className="size-4" />
                Join Team
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <Plus className="size-4" />
                Create Team
              </TabsTrigger>
            </TabsList>
            <TabsContent value="join" className="mt-4">
              <JoinTeamForm />
            </TabsContent>
            <TabsContent value="create" className="mt-4">
              <TeamCreateWizard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

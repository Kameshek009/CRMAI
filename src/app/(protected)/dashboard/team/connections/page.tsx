"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeam } from "@/contexts/team-context";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InviteCodeDisplay } from "@/components/team/invite-code-display";
import { Link2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ConnectionData {
  id: string;
  status: string;
  requester_team_id: string;
  target_team_id: string;
  requester: { id: string; name: string };
  target: { id: string; name: string };
}

export default function TeamConnectionsPage() {
  const { currentTeam, isDirector, can } = useTeam();
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [connectCode, setConnectCode] = useState("");
  const [connecting, setConnecting] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/connections`);
    const json = await res.json();
    if (json.success) setConnections(json.data || []);
  }, [currentTeam]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = async () => {
    if (!currentTeam || !connectCode.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_code: connectCode.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Connection request sent");
        setConnectCode("");
        fetchConnections();
      } else {
        toast.error(json.error || "Failed");
      }
    } catch {
      toast.error("Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleRespond = async (connId: string, status: "accepted" | "rejected") => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/connections/${connId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(status === "accepted" ? "Connection accepted" : "Connection rejected");
      fetchConnections();
    } else {
      toast.error(json.error || "Failed");
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Connections" description="Connect with other teams" />

      {can("team_settings.manage") && currentTeam && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Your Connection Code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Share this with another team&apos;s director to connect.
            </p>
            <InviteCodeDisplay code={currentTeam.inviteCode} teamId={currentTeam.id} />
          </CardContent>
        </Card>
      )}

      {can("team_settings.manage") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Connect to Another Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={connectCode}
                onChange={(e) => setConnectCode(e.target.value)}
                placeholder="Enter team's connection code"
              />
              <Button onClick={handleConnect} disabled={connecting || !connectCode.trim()}>
                <Plus className="size-4 mr-2" />
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {connections.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Link2 className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No connections yet</p>
          </div>
        )}
        {connections.map((conn) => {
          const otherTeam = conn.requester_team_id === currentTeam?.id ? conn.target : conn.requester;
          const isIncoming = conn.target_team_id === currentTeam?.id;

          return (
            <Card key={conn.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <Link2 className="size-5 text-muted-foreground" />
                <div className="flex-1">
                  <span className="font-medium text-sm">{otherTeam.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {isIncoming ? "Incoming" : "Outgoing"}
                  </span>
                </div>
                <Badge variant={
                  conn.status === "accepted" ? "default" :
                  conn.status === "rejected" ? "destructive" : "secondary"
                }>
                  {conn.status}
                </Badge>
                {isIncoming && conn.status === "pending" && can("team_settings.manage") && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8 text-green-600" onClick={() => handleRespond(conn.id, "accepted")}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => handleRespond(conn.id, "rejected")}>
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

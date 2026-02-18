"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MonitorSmartphone, Clock, Zap } from "lucide-react";

interface Session {
  id: string;
  status: string;
  summary: string | null;
  tokens_used: number;
  started_at: string;
  ended_at: string | null;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatDuration(start: string, end: string | null) {
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diff = endTime - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatTokens(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function SessionsContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions?limit=50");
      const json = await res.json();
      if (json.success) {
        setSessions(json.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <PageContainer>
      <PageHeader title="Sessions" description="Your AI agent session history" />

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MonitorSmartphone className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium">No sessions recorded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sessions will appear here when you use the AI agent.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${statusColors[session.status] || ""}`}
                  >
                    {session.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {session.summary || "Untitled session"}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(session.started_at, session.ended_at)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="size-3" />
                        {formatTokens(session.tokens_used)} tokens
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {timeAgo(session.started_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

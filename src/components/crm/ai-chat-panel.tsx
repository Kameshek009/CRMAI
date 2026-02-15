"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, Loader2, X, Sparkles, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";

interface ToolResult {
  name: string;
  success: boolean;
  result: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolResults?: ToolResult[];
  isError?: boolean;
}

export function AiChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (messageOverride?: string) => {
    const userMessage = (messageOverride || input).trim();
    if (!userMessage || isLoading) return;

    if (!messageOverride) setInput("");
    setLastFailedMessage(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/crm/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();

      if (res.status === 429) {
        const reason = json.reason || "You have reached your daily AI usage limit.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `**Usage limit reached**\n\n${reason}\n\nPlease try again later or upgrade your plan for higher limits.`,
            isError: true,
          },
        ]);
        return;
      }

      if (json.success) {
        const toolResults: ToolResult[] | undefined = json.data.toolResults?.length
          ? json.data.toolResults.map((tr: ToolResult) => ({
              name: tr.name,
              success: tr.success,
              result: tr.result,
            }))
          : undefined;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.data.response, toolResults },
        ]);
      } else {
        setLastFailedMessage(userMessage);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.error || "Sorry, something went wrong. Please try again.",
            isError: true,
          },
        ]);
      }
    } catch {
      setLastFailedMessage(userMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect to AI. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleRetry = () => {
    if (!lastFailedMessage) return;
    // Remove the last error message
    setMessages((prev) => prev.slice(0, -1));
    sendMessage(lastFailedMessage);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 size-12 rounded-full shadow-lg z-50"
      >
        <Sparkles className="size-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <span className="font-medium text-sm">CRM Assistant</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setIsOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Bot className="size-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">How can I help?</p>
            <p className="mt-1">Try: &quot;Add contact Ivan Petrov&quot;, &quot;Show overdue tasks&quot;, or &quot;Mark call task as done&quot;</p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : msg.isError
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-muted"
                )}
              >
                {msg.role === "assistant" ? (
                  <Markdown content={msg.content} className="text-sm [&_p]:my-0.5 [&_strong]:font-semibold" />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* Tool result badges */}
              {msg.toolResults && msg.toolResults.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
                  {msg.toolResults.map((tr, j) => (
                    <span
                      key={j}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        tr.success
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {tr.success ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <XCircle className="size-3" />
                      )}
                      {tr.name.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              {/* Retry button on error */}
              {msg.isError && lastFailedMessage && i === messages.length - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  <RotateCcw className="size-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted max-w-[85%] rounded-lg px-3 py-2">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Update contact, complete task, show deals..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

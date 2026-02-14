'use client';

/**
 * Chat Detail Page
 *
 * Displays a single chat with messages and allows sending new messages.
 * Supports real-time updates and agent task visualization.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from '@/contexts/account-context';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { AgentStatusBadge } from '@/components/ui/agent-status-badge';
import { useAgentStatus } from '@/hooks/use-agent-status';
import type { Chat, Message, VisionBoard } from '@/lib/supabase/types';

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { account } = useAccount();
  const { isOnline: isAgentOnline, mode: agentMode } = useAgentStatus();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visionBoard, setVisionBoard] = useState<VisionBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch chat data via API (server-side auth)
  const fetchChat = useCallback(async () => {
    if (!chatId || !account?.id) return;

    try {
      setIsLoading(true);

      // Use API route instead of direct Supabase (server-side auth)
      const response = await fetch(`/api/chats/${chatId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load chat');
      }

      setChat(result.chat);
      setMessages(result.messages || []);
      setVisionBoard(result.visionBoard || null);
    } catch (err) {
      console.error('Error fetching chat:', err);
      toast.error('Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  }, [chatId, account?.id]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Real-time subscription for messages via SSE
  // Uses /api/chats/[id]/stream endpoint which bypasses RLS issues
  // Note: Deduplication checks both id AND local_id to prevent race condition
  // between optimistic update and SSE
  useEffect(() => {
    if (!chatId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/chats/${chatId}/stream`);

      eventSource.addEventListener('message:new', (event) => {
        try {
          const newMessage = JSON.parse(event.data) as Message;
          setMessages((prev) => {
            // Skip if message already exists by id
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            // Skip if message exists by local_id (handles optimistic update race)
            if (newMessage.local_id && prev.some((m) => m.local_id === newMessage.local_id)) return prev;
            // Skip temp messages that haven't been replaced yet
            if (prev.some((m) => m.id.startsWith('temp-') && m.content === newMessage.content)) return prev;
            return [...prev, newMessage];
          });
        } catch (err) {
          console.error('[Chat] Failed to parse SSE message:', err);
        }
      });

      eventSource.onerror = () => {
        console.warn('[Chat] SSE connection error, reconnecting...');
        eventSource?.close();
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [chatId]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !chatId || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    // Generate a unique local_id for deduplication
    const localId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      role: 'user',
      content,
      metadata: {},
      message_type: 'text',
      tokens_used: 0,
      local_id: localId,
      device_origin: 'web',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // Store user message
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content,
          message_type: 'text',
        }),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) => (m.local_id === localId ? result.message : m))
      );

      // For chat mode: call CRM AI and store response
      if (chat?.mode === 'chat') {
        // Build history from previous messages (exclude current one to avoid duplicate)
        const recentMessages = messages
          .filter((m) => !m.id.startsWith('temp-'))
          .slice(-10)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        const aiRes = await fetch('/api/crm/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: recentMessages,
          }),
        });
        const aiJson = await aiRes.json();

        let aiContent: string;
        if (aiJson.success) {
          aiContent = aiJson.data.response;
          // Append token usage info
          if (aiJson.data.usage) {
            const { tokensUsed, accountTokensUsed, accountTokenLimit } = aiJson.data.usage;
            const remaining = Math.max(0, accountTokenLimit - accountTokensUsed);
            const formatT = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
            aiContent += `\n\n---\n*Tokens: -${formatT(tokensUsed)} | Remaining: ${formatT(remaining)} / ${formatT(accountTokenLimit)}*`;
          }
        } else if (aiJson.reason === 'weekly_cap_exceeded' || aiJson.reason === 'monthly_cap_exceeded') {
          aiContent = 'Your token limit has been reached. Please upgrade your plan or wait for the limit to reset.';
        } else {
          aiContent = 'Sorry, something went wrong. Please try again.';
        }

        // Store AI response as a message
        const aiMsgRes = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: aiContent,
            message_type: 'text',
          }),
        });
        const aiMsgResult = await aiMsgRes.json();

        if (aiMsgResult.success) {
          setMessages((prev) => [...prev, aiMsgResult.message]);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter((m) => m.local_id !== localId));
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Delete chat via API
  const handleDeleteChat = async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete chat');
      }

      toast.success('Chat deleted');
      router.push('/dashboard/chats');
    } catch (err) {
      console.error('Error deleting chat:', err);
      toast.error('Failed to delete chat');
    }
  };

  // Format time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 sm:p-6">
        <Skeleton className="h-8 sm:h-10 w-36 sm:w-48 mb-4" />
        <div className="flex-1 space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 sm:h-16 w-4/5 sm:w-3/4" />
          ))}
        </div>
        <Skeleton className="h-11 sm:h-12 w-full" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6">
        <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Chat not found</h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 text-center px-4">
          This chat may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push('/dashboard/chats')} className="h-10">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chats
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => router.push('/dashboard/chats')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">
              {chat.title || 'New Chat'}
            </h1>
            <div className="flex items-center gap-2">
              <AgentStatusBadge compact />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteChat}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Vision Board Status */}
      {visionBoard && (
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-4 w-4 text-chart-3 shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{visionBoard.title}</span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full shrink-0',
                  visionBoard.status === 'active' && 'bg-success/20 text-success',
                  visionBoard.status === 'completed' && 'bg-chart-1/20 text-chart-1',
                  visionBoard.status === 'failed' && 'bg-destructive/20 text-destructive',
                  visionBoard.status === 'paused' && 'bg-warning/20 text-warning'
                )}
              >
                {visionBoard.status}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {visionBoard.completed_steps}/{visionBoard.total_steps}
            </span>
          </div>
          {visionBoard.current_task && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Current: {visionBoard.current_task}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">
              {chat?.mode === 'chat' ? 'CRM AI Assistant' : 'Start a conversation'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              {chat?.mode === 'chat'
                ? 'Try: "Add contact John Smith" or "Show pipeline summary"'
                : 'Describe a task for the agent to complete on your desktop.'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start',
                // Add animation for new messages (last 2 messages)
                index >= messages.length - 2 && message.role === 'user'
                  ? 'message-animate-in-right'
                  : index >= messages.length - 2 && message.role !== 'user'
                  ? 'message-animate-in-left'
                  : ''
              )}
            >
              {message.role !== 'user' && (
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    message.message_type === 'error'
                      ? 'bg-destructive/20'
                      : message.message_type === 'result'
                      ? 'bg-success/20'
                      : 'bg-muted'
                  )}
                >
                  {message.message_type === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : message.message_type === 'result' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Bot className="h-4 w-4 text-chart-1" />
                  )}
                </div>
              )}

              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[75%] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.message_type === 'error'
                    ? 'bg-destructive/10 border border-destructive/30'
                    : message.message_type === 'result'
                    ? 'bg-success/10 border border-success/30'
                    : message.message_type === 'plan' || message.message_type === 'action'
                    ? 'bg-warning/10 border border-warning/30'
                    : 'bg-muted'
                )}
              >
                {message.message_type !== 'text' && message.role !== 'user' && (
                  <p className="text-xs font-medium uppercase mb-1 opacity-70">
                    {message.message_type}
                  </p>
                )}
                {message.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <Markdown content={message.content} />
                )}
                <p
                  className={cn(
                    'text-xs mt-2',
                    message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  )}
                >
                  {formatTime(message.created_at)}
                  {message.tokens_used > 0 && ` · ${message.tokens_used} tokens`}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-t">
        {/* Offline warning */}
        {!isAgentOnline && (
          <div className="flex items-center gap-2 mb-2.5 sm:mb-3 p-2.5 sm:p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertCircle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs sm:text-sm text-warning">
              Agent offline. Messages will be queued.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chat?.mode === 'chat'
                ? 'Ask CRM AI anything...'
                : !isAgentOnline
                ? 'Agent offline - message will be queued...'
                : chat?.mode === 'agent'
                ? 'Describe a task for the agent...'
                : 'Send a message...'
            }
            className="min-h-[44px] max-h-32 resize-none text-sm sm:text-base"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

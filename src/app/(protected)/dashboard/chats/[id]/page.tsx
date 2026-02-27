'use client';

/**
 * Chat Detail Page
 *
 * Displays a single chat with messages and allows sending new messages.
 * Supports real-time updates via SSE and agent task visualization.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useAccount } from '@/contexts/account-context';
import { logger } from '@/lib/logger';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Chat, Message, VisionBoard, Json } from '@/lib/supabase/types';

import { ChatHeader } from './components/chat-header';
import { ChatMessages } from './components/chat-messages';
import { ChatComposer, type AttachmentData } from './components/chat-composer';
import { ChatSearch } from './components/chat-search';

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { account } = useAccount();
  const { user } = useUser();
  const { t, locale } = useTranslation();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visionBoard, setVisionBoard] = useState<VisionBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [rateLimitResetsAt, setRateLimitResetsAt] = useState<string | null>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // SSE reconnect state
  const lastSSETimestamp = useRef<string | null>(null);

  // Search logic
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q)).map((m) => m.id);
  }, [messages, searchQuery]);

  const highlightedIds = useMemo(() => new Set(searchMatches), [searchMatches]);

  const currentHighlightId = searchMatches[currentMatchIndex] || null;

  const handleSearchNext = useCallback(() => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
  }, [searchMatches.length]);

  const handleSearchPrev = useCallback(() => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
  }, [searchMatches.length]);

  // Fetch chat data
  const fetchChat = useCallback(async () => {
    if (!chatId || !account?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/chats/${chatId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load chat');
      }

      setChat(result.chat);
      setMessages(result.messages || []);
      setVisionBoard(result.visionBoard || null);

      // Track last message timestamp for SSE reconnect
      const msgs = result.messages || [];
      if (msgs.length > 0) {
        lastSSETimestamp.current = msgs[msgs.length - 1].created_at;
      }
    } catch (err) {
      logger.error('ChatDetailPage', 'Error fetching chat:', err);
      toast.error(t('chat.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [chatId, account?.id]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  // SSE with auto-reconnect and exponential backoff
  useEffect(() => {
    if (!chatId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    let isCancelled = false;

    const connectSSE = () => {
      if (isCancelled) return;

      const sinceParam = lastSSETimestamp.current
        ? `?since=${encodeURIComponent(lastSSETimestamp.current)}`
        : '';
      eventSource = new EventSource(`/api/chats/${chatId}/stream${sinceParam}`);

      eventSource.addEventListener('connected', () => {
        reconnectAttempts = 0; // Reset backoff on successful connect
      });

      eventSource.addEventListener('message:new', (event) => {
        try {
          const newMessage = JSON.parse(event.data) as Message;
          // Track timestamp for reconnect
          if (newMessage.created_at) {
            lastSSETimestamp.current = newMessage.created_at;
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            if (newMessage.local_id && prev.some((m) => m.local_id === newMessage.local_id)) return prev;
            if (prev.some((m) => m.id.startsWith('temp-') && m.content === newMessage.content)) return prev;
            return [...prev, newMessage];
          });
        } catch (err) {
          logger.error('ChatDetailPage', 'Failed to parse SSE message:', err);
        }
      });

      eventSource.addEventListener('disconnected', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.reason === 'max_duration_exceeded') {
            // Immediate reconnect — not an error
            eventSource?.close();
            reconnectTimeout = setTimeout(connectSSE, 500);
            return;
          }
        } catch { /* ignore parse errors */ }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        if (isCancelled) return;

        // Exponential backoff: 3s, 6s, 12s, max 30s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        reconnectTimeout = setTimeout(connectSSE, delay);
      };
    };

    connectSSE();

    return () => {
      isCancelled = true;
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [chatId]);

  // Send message
  const handleSend = useCallback(async (content: string, attachment?: AttachmentData) => {
    if (!chatId || isSending) return;

    // Build content with attachment note for AI
    let messageContent = content;
    if (attachment) {
      const fileNote = `[${t('chat.attachedFile')} ${attachment.filename}]`;
      messageContent = content ? `${content}\n${fileNote}` : fileNote;
    }

    const messageMetadata = (attachment
      ? { attachments: [attachment] }
      : {}) as Json;

    setIsSending(true);
    const localId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      role: 'user',
      content: messageContent,
      metadata: messageMetadata,
      message_type: 'text',
      tokens_used: 0,
      local_id: localId,
      device_origin: 'web',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Step 1: Save user message
    let userMessageSaved = false;
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: messageContent,
          message_type: 'text',
          metadata: messageMetadata,
        }),
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to send message');

      userMessageSaved = true;

      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => (m.local_id === localId ? result.message : m)));

      // Update last timestamp
      if (result.message.created_at) {
        lastSSETimestamp.current = result.message.created_at;
      }
    } catch (err) {
      logger.error('ChatDetailPage', 'Error sending message:', err);
      toast.error(t('chat.failedToSend'));
      setMessages((prev) => prev.filter((m) => m.local_id !== localId));
      setIsSending(false);
      return;
    }

    // Step 2: Call AI (only for chat mode, after user message is saved)
    if (chat?.mode === 'chat') {
      try {
        const recentMessages = messages
          .filter((m) => !m.id.startsWith('temp-'))
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // 30s timeout for AI call
        const aiController = new AbortController();
        const aiTimeout = setTimeout(() => aiController.abort(), 30000);

        const aiRes = await fetch('/api/crm/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, history: recentMessages, locale: locale }),
          signal: aiController.signal,
        });
        clearTimeout(aiTimeout);

        const aiJson = await aiRes.json();

        let aiContent: string;
        if (aiJson.success) {
          aiContent = aiJson.data.response;
          if (aiJson.data.usage) {
            const { tokensUsed, teamTokensUsed, teamTokenLimit } = aiJson.data.usage;
            const remaining = Math.max(0, (teamTokenLimit || 0) - (teamTokensUsed || 0));
            const formatT = (n: number) =>
              n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
            aiContent += `\n\n---\n*${locale === 'ru' ? 'Использовано' : 'Used'}: ${formatT(tokensUsed)} | ${locale === 'ru' ? 'Осталось' : 'Remaining'}: ${formatT(remaining)} / ${formatT(teamTokenLimit || 0)}*`;
          }
          setRateLimitResetsAt(null);
        } else if (aiJson.reason === 'weekly_cap_exceeded' || aiJson.reason === 'monthly_cap_exceeded') {
          if (aiJson.resetsAt) setRateLimitResetsAt(aiJson.resetsAt);
          aiContent = t('chat.dailyLimitMessage');
        } else {
          logger.error('ChatDetailPage', 'AI error response:', aiJson);
          aiContent = t('chat.aiError');
        }

        // Save AI response
        const aiMsgRes = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: aiContent, message_type: 'text' }),
        });
        const aiMsgResult = await aiMsgRes.json();

        if (aiMsgResult.success) {
          setMessages((prev) => [...prev, aiMsgResult.message]);
          if (aiMsgResult.message.created_at) {
            lastSSETimestamp.current = aiMsgResult.message.created_at;
          }
        } else {
          // Save failed — show response locally anyway
          const fallbackMsg: Message = {
            id: `local-ai-${Date.now()}`,
            chat_id: chatId,
            role: 'assistant',
            content: aiContent,
            metadata: {} as Json,
            message_type: 'text',
            tokens_used: 0,
            local_id: null,
            device_origin: 'web',
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, fallbackMsg]);
        }

        // Send notification messages for created entities (tasks, contacts, deals)
        const rawToolResults = aiJson.success ? aiJson.data.toolResults : null;
        if (rawToolResults && Array.isArray(rawToolResults) && rawToolResults.length > 0) {
          const toolResults = rawToolResults as { name: string; success?: boolean; result: string; data?: Record<string, unknown> }[];

          const entityLinks: Record<string, string> = {
            create_task: '/dashboard/tasks',
            create_contact: '/dashboard/contacts',
            create_deal: '/dashboard/deals',
          };
          const entityTypes: Record<string, string> = {
            create_task: 'task',
            create_contact: 'contact',
            create_deal: 'deal',
          };
          const entityLabels: Record<string, [string, string]> = {
            task: ['задача', 'задач'],
            contact: ['контакт', 'контактов'],
            deal: ['сделка', 'сделок'],
          };

          // Group by entity type — only count SUCCESSFUL tool calls
          const grouped = new Map<string, typeof toolResults>();
          for (const r of toolResults) {
            if (r.name in entityLinks && r.success !== false) {
              if (!grouped.has(r.name)) grouped.set(r.name, []);
              grouped.get(r.name)!.push(r);
            }
          }

          for (const [toolName, results] of grouped) {
            const eType = entityTypes[toolName];
            const [single, plural] = (eType && entityLabels[eType]) || ['item', 'items'];

            // Calculate actual count (accounting for batch results with count field)
            let totalCount = 0;
            const entityIds: string[] = [];
            for (const r of results) {
              const batchCount = (r.data?.count as number) || 0;
              if (batchCount > 1) {
                totalCount += batchCount;
                const items = r.data?.items as { id: string }[] | undefined;
                if (items) entityIds.push(...items.map(item => item.id));
              } else {
                totalCount += 1;
                if (r.data?.id) entityIds.push(r.data.id as string);
              }
            }

            const firstResult = results[0];
            const notifContent = totalCount === 1 && firstResult
              ? (firstResult.data?.title as string || firstResult.data?.first_name as string || firstResult.result)
              : `Создано ${totalCount} ${plural}`;

            try {
              const notifRes = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: notifContent,
                  message_type: 'notification',
                  metadata: {
                    entity_type: eType,
                    count: totalCount,
                    entity_ids: entityIds,
                    link: entityLinks[toolName],
                  },
                }),
              });
              const notifResult = await notifRes.json();
              if (notifResult.success) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === notifResult.message.id)) return prev;
                  return [...prev, notifResult.message];
                });
                if (notifResult.message.created_at) {
                  lastSSETimestamp.current = notifResult.message.created_at;
                }
              }
            } catch (notifErr) {
              logger.error('ChatDetailPage', 'Notification save error:', notifErr);
            }
          }
        }
      } catch (err) {
        logger.error('ChatDetailPage', 'AI error:', err);
        const errorContent = err instanceof DOMException && err.name === 'AbortError'
          ? t('chat.aiTimeout')
          : t('chat.aiError');

        // Show error as AI message so user sees feedback
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          chat_id: chatId,
          role: 'assistant',
          content: errorContent,
          metadata: {} as Json,
          message_type: 'error',
          tokens_used: 0,
          local_id: null,
          device_origin: 'web',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    }

    setIsSending(false);
  }, [chatId, isSending, chat?.mode, messages]);

  // Delete message (optimistic)
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const deleted = messages.find((m) => m.id === messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      const res = await fetch(`/api/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error();
    } catch {
      // Restore on failure
      if (deleted) {
        setMessages((prev) => [...prev, deleted].sort(
          (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        ));
      }
      toast.error(t('common.error'));
    }
  }, [chatId, messages]);

  // Delete chat
  const handleDeleteChat = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete chat');
      toast.success(t('common.delete'));
      router.push('/dashboard/chats');
    } catch (err) {
      logger.error('ChatDetailPage', 'Error deleting chat:', err);
      toast.error(t('common.error'));
    }
  }, [chatId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 sm:px-6 py-4 border-b">
          <Skeleton className="h-8 w-36 sm:w-48" />
        </div>
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pt-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="pl-8 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
        <h2 className="text-lg sm:text-xl font-semibold mb-2">{t('chat.notFound')}</h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 text-center px-4">
          {t('chat.notFoundDescription')}
        </p>
        <Button onClick={() => router.push('/dashboard/chats')} className="h-10">
          {t('chat.backToChats')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        chat={chat}
        onChatUpdate={setChat}
        onDelete={handleDeleteChat}
        onSearchToggle={() => {
          setSearchOpen((prev) => !prev);
          if (searchOpen) {
            setSearchQuery('');
            setCurrentMatchIndex(0);
          }
        }}
      />

      <ChatSearch
        isOpen={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery('');
          setCurrentMatchIndex(0);
        }}
        query={searchQuery}
        onQueryChange={(q) => {
          setSearchQuery(q);
          setCurrentMatchIndex(0);
        }}
        matchCount={searchMatches.length}
        currentMatch={currentMatchIndex}
        onNext={handleSearchNext}
        onPrev={handleSearchPrev}
      />

      {/* Vision Board Status */}
      {visionBoard && (
        <div className="px-4 sm:px-6 py-2 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-chart-3 shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{visionBoard.title}</span>
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full shrink-0',
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
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-3xl mx-auto">
              Current: {visionBoard.current_task}
            </p>
          )}
        </div>
      )}

      <ChatMessages
        messages={messages}
        chat={chat}
        isSending={isSending}
        searchQuery={searchQuery}
        highlightedIds={highlightedIds}
        currentHighlightId={currentHighlightId}
        onDeleteMessage={handleDeleteMessage}
        onQuickSend={handleSend}
        userImageUrl={user?.imageUrl}
      />

      <ChatComposer
        chat={chat}
        chatId={chatId}
        isSending={isSending}
        rateLimitResetsAt={rateLimitResetsAt}
        onSend={handleSend}
      />
    </div>
  );
}

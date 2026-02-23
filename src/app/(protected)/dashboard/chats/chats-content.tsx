'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/contexts/account-context';
import { supabase } from '@/lib/supabase/client';
import { Plus, MessageSquare, Search, Trash2, MoreVertical, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentStatusBadge } from '@/components/ui/agent-status-badge';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/crm/confirm-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from "@/lib/i18n";
import type { Chat } from '@/lib/supabase/types';

interface ChatListItem extends Chat {
  message_count: number;
  last_message_preview?: string;
}

interface ChatWithMessages extends Chat {
  messages: Array<{ id: string; content: string; created_at: string }>;
}

function getLastVisit(chatId: string): string | null {
  try {
    return localStorage.getItem(`chat_last_visit_${chatId}`);
  } catch {
    return null;
  }
}

function markChatVisited(chatId: string) {
  try {
    localStorage.setItem(`chat_last_visit_${chatId}`, new Date().toISOString());
  } catch { /* ignore */ }
}

function isUnread(chat: ChatListItem): boolean {
  const updatedAt = chat.updated_at || chat.created_at;
  if (!updatedAt || chat.message_count === 0) return false;
  const lastVisit = getLastVisit(chat.id);
  if (!lastVisit) return true;
  return new Date(updatedAt).getTime() > new Date(lastVisit).getTime();
}

export function ChatsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { account, isLoading: accountLoading } = useAccount();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  const fetchChats = useCallback(async (silent = false) => {
    if (!account?.id) return;

    try {
      if (!silent && isInitialLoad.current) {
        setIsLoading(true);
      }

      const response = await fetch('/api/chats');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch chats');
      }

      const chatList: ChatListItem[] = ((result.chats || []) as ChatWithMessages[]).map((chat) => {
        const messages = chat.messages || [];
        const lastMessage = messages.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          ...chat,
          message_count: messages.length,
          last_message_preview: lastMessage?.content?.slice(0, 100),
        };
      });

      setChats(chatList);
      isInitialLoad.current = false;
    } catch (err) {
      void err;
      if (!silent) {
        toast.error(t("crm.chats.failedLoad"));
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [account?.id, t]);

  useEffect(() => {
    if (account?.id) {
      fetchChats();
    }
  }, [account?.id, fetchChats]);

  useEffect(() => {
    if (!account?.id) return;

    const channel = supabase
      .channel(`chats-sync:${account.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `account_id=eq.${account.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newChat = payload.new as Chat;
          setChats((prev) => {
            if (prev.some((c) => c.id === newChat.id)) return prev;
            return [{ ...newChat, message_count: 0, last_message_preview: undefined }, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `account_id=eq.${account.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const updatedChat = payload.new as Chat;
          setChats((prev) => {
            const existing = prev.find((c) => c.id === updatedChat.id);
            if (!existing) return prev;
            if (updatedChat.is_deleted) {
              return prev.filter((c) => c.id !== updatedChat.id);
            }
            const updated = { ...existing, ...updatedChat };
            return [updated, ...prev.filter((c) => c.id !== updatedChat.id)];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chats',
          filter: `account_id=eq.${account.id}`,
        },
        (payload: { old: Record<string, unknown> }) => {
          const deletedChat = payload.old as { id: string };
          setChats((prev) => prev.filter((c) => c.id !== deletedChat.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [account?.id]);

  const handleCreateChat = async () => {
    if (!account?.id) return;

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat' }),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create chat');
      }

      toast.success(t("crm.chats.created"));
      router.push(`/dashboard/chats/${result.chat.id}`);
    } catch (err) {
      void err;
      toast.error(t("crm.chats.failedCreate"));
    }
  };

  const handleDeleteChat = async () => {
    if (!deleteChatId) return;
    try {
      const response = await fetch(`/api/chats?chat_id=${deleteChatId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete chat');
      }

      setChats((prev) => prev.filter((c) => c.id !== deleteChatId));
      toast.success(t("crm.chats.deleted"));
    } catch (err) {
      void err;
      toast.error(t("crm.chats.failedDelete"));
    } finally {
      setDeleteChatId(null);
    }
  };

  const filteredChats = chats.filter((chat) => {
    const title = chat.title || t("crm.chats.new");
    const preview = chat.last_message_preview || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || preview.toLowerCase().includes(query);
  });

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("crm.chats.now");
    if (diffMins < 60) return t("crm.activity.mAgo", { count: diffMins });
    if (diffHours < 24) return t("crm.activity.hAgo", { count: diffHours });
    if (diffDays < 7) return t("crm.activity.dAgo", { count: diffDays });

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getModeIcon = (mode: Chat['mode']) => {
    switch (mode) {
      case 'agent':
        return <Bot className="h-4 w-4 text-chart-3" />;
      case 'auto':
        return <Sparkles className="h-4 w-4 text-chart-4" />;
      default:
        return <MessageSquare className="h-4 w-4 text-chart-1" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      x: -20,
      scale: 0.98,
      transition: {
        type: 'tween' as const,
        ease: 'easeOut' as const,
        duration: 0.2,
      },
    },
  };

  if (accountLoading) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <Skeleton className="h-8 sm:h-10 w-32 sm:w-64" />
          <div className="grid gap-2 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 sm:h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:block">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{t("crm.chats.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              {t("crm.chats.description")}
            </p>
          </div>
          <Button onClick={handleCreateChat} size="icon" className="sm:hidden h-10 w-10">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <AgentStatusBadge compact />
          <Button onClick={handleCreateChat} className="hidden sm:flex gap-2">
            <Plus className="h-4 w-4" />
            {t("crm.chats.new")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("crm.chats.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50 border-border/50 focus:border-border transition-colors"
        />
      </div>

      {/* Chat List */}
      {isLoading ? (
        <div className="grid gap-2 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 sm:h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredChats.length === 0 && searchQuery ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <Search className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2 text-base sm:text-lg">{t("crm.chats.noResults")}</CardTitle>
              <CardDescription className="text-center mb-4 sm:mb-6 max-w-sm text-sm">
                {t("crm.chats.noChatsFor", { query: searchQuery })}
              </CardDescription>
              <Button onClick={() => setSearchQuery('')} variant="ghost" className="gap-2 h-10">
                {t("crm.chats.clearSearch")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : filteredChats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2 text-base sm:text-lg">{t("crm.chats.noYet")}</CardTitle>
              <CardDescription className="text-center mb-4 sm:mb-6 max-w-sm text-sm">
                {t("crm.chats.noYetDesc")}
              </CardDescription>
              <Button onClick={handleCreateChat} variant="outline" className="gap-2 h-10">
                <Plus className="h-4 w-4" />
                {t("crm.chats.new")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-2 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                layout
                layoutId={chat.id}
              >
                <Card
                  className="cursor-pointer group border-border/50 hover:border-border hover:bg-accent/30 active:bg-accent/50 transition-all duration-200"
                  onClick={() => {
                    markChatVisited(chat.id);
                    router.push(`/dashboard/chats/${chat.id}`);
                  }}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="rounded-xl bg-muted/50 p-2 group-hover:bg-muted transition-colors shrink-0">
                        {getModeIcon(chat.mode)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-4 mb-1">
                          {isUnread(chat) && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          )}
                          <h3 className="font-medium text-foreground truncate text-sm sm:text-sm">
                            {chat.title || t("crm.chats.new")}
                          </h3>
                          <span className="text-xs text-muted-foreground/50 bg-muted px-2 py-1 rounded shrink-0">
                            {chat.mode === 'chat' ? t("crm.chats.modeChat") : chat.mode === 'agent' ? t("crm.chats.modeAgent") : t("crm.chats.modeAuto")}
                          </span>
                          <span className="text-xs text-muted-foreground/70 shrink-0">
                            {formatTime(chat.updated_at || chat.created_at || new Date().toISOString())}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {chat.last_message_preview || t("crm.chats.noMessages")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground/60 tabular-nums hidden sm:inline">
                          {t("crm.chats.msgs", { count: chat.message_count })}
                        </span>
                        <span className="text-xs text-muted-foreground/60 tabular-nums sm:hidden">
                          {chat.message_count}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteChatId(chat.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("crm.chats.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      </div>

      <ConfirmDialog
        open={!!deleteChatId}
        onOpenChange={(open) => { if (!open) setDeleteChatId(null); }}
        title={t("crm.chats.deleteTitle")}
        description={t("crm.chats.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="destructive"
        onConfirm={handleDeleteChat}
      />
    </div>
  );
}

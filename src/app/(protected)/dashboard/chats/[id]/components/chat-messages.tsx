'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ArrowDown,
  UserPlus,
  BarChart3,
  CheckSquare,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageBubble, TypingIndicator } from './message-bubble';
import { AnimatePresence, motion } from 'framer-motion';
import type { Chat, Message } from '@/lib/supabase/types';

interface ChatMessagesProps {
  messages: Message[];
  chat: Chat;
  isSending: boolean;
  searchQuery: string;
  highlightedIds: Set<string>;
  currentHighlightId: string | null;
  onDeleteMessage: (messageId: string) => void;
  onQuickSend: (content: string) => void;
  userImageUrl?: string;
}

function getDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-6">
      <span className="text-xs text-muted-foreground/50 font-medium">{label}</span>
    </div>
  );
}

const QUICK_SUGGESTIONS = [
  { icon: UserPlus, label: 'Add a contact', prompt: 'Add contact John Smith with email john@example.com' },
  { icon: BarChart3, label: 'Pipeline summary', prompt: 'Show pipeline summary' },
  { icon: CheckSquare, label: 'Overdue tasks', prompt: 'Show overdue tasks' },
  { icon: Search, label: 'Search contacts', prompt: 'Search for contacts in New York' },
];

export function ChatMessages({
  messages,
  chat,
  isSending,
  searchQuery,
  highlightedIds,
  currentHighlightId,
  onDeleteMessage,
  onQuickSend,
  userImageUrl,
}: ChatMessagesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isUserScrolling = useRef(false);

  // IntersectionObserver for scroll-to-bottom button
  useEffect(() => {
    const endEl = messagesEndRef.current;
    if (!endEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(endEl);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom only when at bottom or new own message
  const scrollToBottom = useCallback(() => {
    if (!isUserScrolling.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom, isAtBottom]);

  // Track manual scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      isUserScrolling.current = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserScrolling.current = false;
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Scroll to highlighted message when searching
  useEffect(() => {
    if (currentHighlightId) {
      const el = document.getElementById(`msg-${currentHighlightId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentHighlightId]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: Message[] }[] = [];
    let currentLabel = '';

    for (const msg of messages) {
      const label = getDateLabel(msg.created_at || new Date().toISOString());
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  // Empty state with suggestion grid
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
          <div className="rounded-full bg-chart-1/10 p-4 mb-6">
            <Sparkles className="h-8 w-8 text-chart-1" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {chat.mode === 'chat' ? 'CRM AI Assistant' : 'Start a conversation'}
          </h3>
          <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
            {chat.mode === 'chat'
              ? 'Manage your CRM with natural language. Try one of these suggestions:'
              : 'Describe a task for the agent to complete on your desktop.'}
          </p>
          {chat.mode === 'chat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.label}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-left group/card"
                  onClick={() => onQuickSend(suggestion.prompt)}
                >
                  <suggestion.icon className="h-5 w-5 text-muted-foreground group-hover/card:text-foreground transition-colors" />
                  <span className="text-sm font-medium text-foreground">{suggestion.label}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{suggestion.prompt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        {groupedMessages.map((group) => (
          <div key={group.label}>
            <DateSeparator label={group.label} />
            <div className="divide-y divide-border/20">
              {group.messages.map((message, index) => (
                <div key={message.id} id={`msg-${message.id}`}>
                  <MessageBubble
                    message={message}
                    isNew={
                      index >= group.messages.length - 2 &&
                      group === groupedMessages[groupedMessages.length - 1]
                    }
                    isHighlighted={
                      highlightedIds.has(message.id) ||
                      currentHighlightId === message.id
                    }
                    onDelete={onDeleteMessage}
                    userImageUrl={userImageUrl}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence mode="wait">
          {isSending && chat.mode === 'chat' && <TypingIndicator key="typing" />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
          >
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-lg h-9 w-9"
              onClick={() => {
                isUserScrolling.current = false;
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

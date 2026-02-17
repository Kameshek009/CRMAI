'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Bot, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageBubble, TypingIndicator } from './message-bubble';
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
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

const QUICK_SUGGESTIONS = [
  'Add contact John Smith',
  'Show pipeline summary',
  'Show overdue tasks',
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

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Bot className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-medium mb-2">
            {chat.mode === 'chat' ? 'CRM AI Assistant' : 'Start a conversation'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6">
            {chat.mode === 'chat'
              ? 'Manage your CRM with natural language commands'
              : 'Describe a task for the agent to complete on your desktop.'}
          </p>
          {chat.mode === 'chat' && (
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onQuickSend(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
      <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {groupedMessages.map((group) => (
          <div key={group.label}>
            <DateSeparator label={group.label} />
            <div className="space-y-3 sm:space-y-4">
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
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isSending && chat.mode === 'chat' && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 rounded-full shadow-lg h-10 w-10 z-10"
          onClick={() => {
            isUserScrolling.current = false;
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

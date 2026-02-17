'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp, Loader2, Clock, AlertCircle, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/supabase/types';

interface ChatComposerProps {
  chat: Chat;
  isSending: boolean;
  isAgentOnline: boolean;
  rateLimitResetsAt: string | null;
  onSend: (content: string) => void;
}

export function ChatComposer({
  chat,
  isSending,
  isAgentOnline,
  rateLimitResetsAt,
  onSend,
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live countdown timer for daily limit reset
  useEffect(() => {
    if (!rateLimitResetsAt) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const resetTime = new Date(rateLimitResetsAt).getTime();
      const diff = resetTime - now;

      if (diff <= 0) {
        setCountdown('');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rateLimitResetsAt]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    onSend(input.trim());
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Daily limit countdown */}
        {rateLimitResetsAt && countdown && (
          <div className="flex items-center justify-between gap-2 mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs sm:text-sm text-destructive">
                Daily limit reached. Resets in <span className="font-mono font-semibold">{countdown}</span>
              </p>
            </div>
            <a
              href="/dashboard/upgrade"
              className="text-xs font-medium text-destructive hover:underline shrink-0"
            >
              Upgrade
            </a>
          </div>
        )}
        {/* Offline warning */}
        {!isAgentOnline && (
          <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-warning/10 border border-warning/30">
            <AlertCircle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs sm:text-sm text-warning">
              Agent offline. Messages will be queued.
            </p>
          </div>
        )}

        {/* Composer container */}
        <div className={cn(
          'relative rounded-2xl border bg-background transition-all duration-200',
          'shadow-sm hover:shadow-md',
          'focus-within:border-ring focus-within:shadow-md',
          'focus-within:ring-2 focus-within:ring-ring/20',
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              chat.mode === 'chat'
                ? 'Message AI assistant...'
                : !isAgentOnline
                ? 'Agent offline — message will be queued...'
                : chat.mode === 'agent'
                ? 'Describe a task for the agent...'
                : 'Send a message...'
            }
            className={cn(
              'w-full min-h-[52px] max-h-40 resize-none border-none bg-transparent',
              'px-4 pt-3.5 pb-12 text-sm',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-0',
            )}
            disabled={isSending}
          />

          {/* Bottom bar inside composer */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground/50"
                disabled
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg transition-all',
                input.trim() && !isSending
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

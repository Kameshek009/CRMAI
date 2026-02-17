'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 sm:px-6 py-3 sm:py-4 border-t">
      {/* Daily limit countdown */}
      {rateLimitResetsAt && countdown && (
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 p-2.5 sm:p-3 rounded-lg bg-destructive/10 border border-destructive/30">
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
            chat.mode === 'chat'
              ? 'Ask CRM AI anything...'
              : !isAgentOnline
              ? 'Agent offline - message will be queued...'
              : chat.mode === 'agent'
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
  );
}

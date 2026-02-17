'use client';

import {
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { Button } from '@/components/ui/button';
import type { Message } from '@/lib/supabase/types';

interface MessageBubbleProps {
  message: Message;
  isNew?: boolean;
  isHighlighted?: boolean;
  onDelete?: (messageId: string) => void;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function MessageBubble({ message, isNew, isHighlighted, onDelete }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isUser ? 'justify-end' : 'justify-start',
        isNew && isUser && 'message-animate-in-right',
        isNew && !isUser && 'message-animate-in-left',
        isHighlighted && 'ring-2 ring-primary/50 rounded-xl',
      )}
    >
      {!isUser && (
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

      <div className="relative max-w-[85%] sm:max-w-[75%]">
        <div
          className={cn(
            'rounded-xl px-3 sm:px-4 py-2.5 sm:py-3',
            isUser
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
          {message.message_type !== 'text' && !isUser && (
            <p className="text-xs font-medium uppercase mb-1 opacity-70">
              {message.message_type}
            </p>
          )}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Markdown content={message.content} />
          )}
          <p
            className={cn(
              'text-xs mt-2',
              isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
            )}
          >
            {formatTime(message.created_at || new Date().toISOString())}
            {(message.tokens_used ?? 0) > 0 && ` · ${message.tokens_used} tokens`}
          </p>
        </div>

        {/* Delete button on hover */}
        {onDelete && !message.id.startsWith('temp-') && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute -top-2 h-6 w-6 rounded-full bg-background border shadow-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isUser ? '-left-2' : '-right-2'
            )}
            onClick={() => onDelete(message.id)}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-chart-1" />
      </div>
      <div className="bg-muted rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

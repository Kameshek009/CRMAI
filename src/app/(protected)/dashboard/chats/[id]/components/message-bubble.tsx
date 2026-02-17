'use client';

import {
  Sparkles,
  User,
  AlertCircle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { motion } from 'framer-motion';
import type { Message } from '@/lib/supabase/types';

interface MessageBubbleProps {
  message: Message;
  isNew?: boolean;
  isHighlighted?: boolean;
  onDelete?: (messageId: string) => void;
  userImageUrl?: string;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function MessageBubble({ message, isNew, isHighlighted, onDelete, userImageUrl }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const messageType = message.message_type;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group py-5 px-1',
        isHighlighted && 'bg-primary/5 -mx-2 px-3 rounded-lg',
      )}
    >
      {/* Role header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        {isUser ? (
          <>
            {userImageUrl ? (
              <img
                src={userImageUrl}
                alt="You"
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-foreground/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-foreground" />
              </div>
            )}
            <span className="text-sm font-semibold text-foreground">You</span>
          </>
        ) : (
          <>
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center',
              messageType === 'error' ? 'bg-destructive/15' :
              messageType === 'result' ? 'bg-success/15' :
              'bg-chart-1/15'
            )}>
              {messageType === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              ) : messageType === 'result' ? (
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-chart-1" />
              )}
            </div>
            <span className="text-sm font-semibold text-foreground">AI Assistant</span>
          </>
        )}
      </div>

      {/* Message content */}
      <div className={cn(
        'pl-8.5',
        messageType === 'error' && !isUser && 'border-l-2 border-destructive/50 pl-4 ml-8.5',
        messageType === 'result' && !isUser && 'border-l-2 border-success/50 pl-4 ml-8.5',
        (messageType === 'plan' || messageType === 'action') && !isUser && 'border-l-2 border-warning/50 pl-4 ml-8.5',
      )}>
        {messageType !== 'text' && !isUser && (
          <span className="text-xs font-medium uppercase text-muted-foreground mb-1.5 block tracking-wide">
            {messageType}
          </span>
        )}
        {isUser ? (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <Markdown content={message.content} />
        )}
      </div>

      {/* Footer: timestamp + tokens + delete */}
      <div className="flex items-center gap-2.5 mt-2.5 pl-8.5">
        <span className="text-xs text-muted-foreground/60">
          {formatTime(message.created_at || new Date().toISOString())}
        </span>
        {(message.tokens_used ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground/60">
            {message.tokens_used} tokens
          </span>
        )}
        {onDelete && !message.id.startsWith('temp-') && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground/60 hover:text-destructive flex items-center gap-1"
            onClick={() => onDelete(message.id)}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className="py-5 px-1"
    >
      {/* Role header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="h-6 w-6 rounded-full bg-chart-1/15 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-chart-1 animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-foreground">AI Assistant</span>
      </div>

      {/* Shimmer + thinking text */}
      <div className="pl-8.5 flex items-center gap-3">
        <div className="thinking-shimmer h-4 w-16 rounded-full" />
        <span className="text-sm text-muted-foreground/70 animate-pulse">Thinking...</span>
      </div>
    </motion.div>
  );
}

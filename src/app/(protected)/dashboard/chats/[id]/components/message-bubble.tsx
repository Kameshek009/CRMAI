'use client';

import Link from 'next/link';
import {
  Sparkles,
  User,
  AlertCircle,
  CheckCircle,
  Trash2,
  FileText,
  Download,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useTranslation } from '@/lib/i18n';
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

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentInfo {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
}

export function MessageBubble({ message, isNew, isHighlighted, onDelete, userImageUrl }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const messageType = message.message_type;
  const metadata = message.metadata as Record<string, unknown> | null;
  const attachments: AttachmentInfo[] = (metadata?.attachments as AttachmentInfo[]) || [];

  // Notification card rendering
  if (messageType === 'notification' && metadata?.link) {
    const count = Number(metadata.count) || 1;
    const entityLabels: Record<string, [string, string]> = {
      task: [t('crm.chats.notification.taskCreated'), t('crm.chats.notification.openTasks')],
      contact: [t('crm.chats.notification.contactCreated'), t('crm.chats.notification.openContacts')],
      company: [t('crm.chats.notification.companyCreated'), t('crm.chats.notification.openCompanies')],
      deal: [t('crm.chats.notification.dealCreated'), t('crm.chats.notification.openDeals')],
      showing: [t('crm.chats.notification.showingCreated'), t('crm.chats.notification.openShowings')],
    };
    const eType = String(metadata.entity_type || 'task');
    const [singleLabel, viewLabel] = entityLabels[eType] || [t('crm.chats.notification.created'), t('crm.chats.notification.open')];

    return (
      <div className="py-1 px-1">
        <Link
          href={String(metadata.link)}
          className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 transition-colors hover:bg-emerald-500/10"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{message.content}</p>
            <p className="text-xs text-muted-foreground">
              {count === 1 ? singleLabel : viewLabel}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    );
  }

  // Strip "[Attached file: ...]" from display for user messages
  const displayContent = isUser
    ? message.content.replace(/\n?\[Attached file: [^\]]+\]$/, '').trim()
    : message.content;

  return (
    <div
      className={cn(
        'group py-6 px-1',
        isHighlighted && 'bg-primary/5 -mx-2 px-4 rounded-lg',
      )}
    >
      {/* Role header */}
      <div className="flex items-center gap-2 mb-2">
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
            <span className="text-sm font-semibold text-foreground">{t('crm.chats.you')}</span>
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
            <span className="text-sm font-semibold text-foreground">{t('crm.chats.aiAssistant')}</span>
          </>
        )}
      </div>

      {/* Message content */}
      <div className={cn(
        'pl-8',
        messageType === 'error' && !isUser && 'border-l-2 border-destructive/50 pl-4 ml-8',
        messageType === 'result' && !isUser && 'border-l-2 border-success/50 pl-4 ml-8',
        (messageType === 'plan' || messageType === 'action') && !isUser && 'border-l-2 border-warning/50 pl-4 ml-8',
      )}>
        {messageType !== 'text' && !isUser && (
          <span className="text-xs font-medium uppercase text-muted-foreground mb-2 block tracking-wide">
            {messageType}
          </span>
        )}
        {isUser ? (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{displayContent}</p>
        ) : (
          <Markdown content={message.content} />
        )}
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {attachments.map((att) => (
              att.mime_type?.startsWith('image/') ? (
                <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={att.url}
                    alt={att.filename}
                    className="max-w-xs sm:max-w-sm rounded-xl border border-border/50 hover:border-border transition-colors"
                    loading="lazy"
                  />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all max-w-xs"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              )
            ))}
          </div>
        )}
      </div>

      {/* Footer: timestamp + tokens + delete */}
      <div className="flex items-center gap-2 mt-2 pl-8">
        <span className="text-xs text-muted-foreground/80">
          {formatTime(message.created_at || new Date().toISOString())}
        </span>
        {(message.tokens_used ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground/80">
            {message.tokens_used} {t('crm.chats.tokens')}
          </span>
        )}
        {onDelete && !message.id.startsWith('temp-') && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground/80 hover:text-destructive flex items-center gap-1"
            onClick={() => onDelete(message.id)}
          >
            <Trash2 className="h-3 w-3" />
            {t('common.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  const { t } = useTranslation();
  return (
    <div className="py-6 px-1">
      {/* Role header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-full bg-chart-1/15 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-chart-1 animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-foreground">{t('crm.chats.aiAssistant')}</span>
      </div>

      {/* Shimmer + thinking text */}
      <div className="pl-8 flex items-center gap-4">
        <div className="thinking-shimmer h-4 w-16 rounded-full" />
        <span className="text-sm text-muted-foreground/70 animate-pulse">{t('crm.chats.thinking')}</span>
      </div>
    </div>
  );
}

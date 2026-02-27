'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp, Loader2, Clock, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import type { Chat } from '@/lib/supabase/types';

interface AttachmentPreview {
  file: File;
  previewUrl?: string;
  isImage: boolean;
}

export interface AttachmentData {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
}

interface ChatComposerProps {
  chat: Chat;
  chatId: string;
  isSending: boolean;
  rateLimitResetsAt: string | null;
  onSend: (content: string, attachment?: AttachmentData) => void;
}

const ACCEPT_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/json,.doc,.docx';

export function ChatComposer({
  chat,
  chatId,
  isSending,
  rateLimitResetsAt,
  onSend,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState('');
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live countdown timer for daily limit reset
  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('chat.fileTooLarge'));
      return;
    }

    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

    setAttachment({ file, previewUrl, isImage });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isSending || isUploading) return;

    let uploadedAttachment: AttachmentData | undefined;

    // Upload file first if attached
    if (attachment) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachment.file);

        const res = await fetch(`/api/chats/${chatId}/upload`, {
          method: 'POST',
          body: formData,
        });
        const result = await res.json();

        if (!result.success) {
          toast.error(result.error || t('chat.failedUpload'));
          setIsUploading(false);
          return;
        }

        uploadedAttachment = result.attachment;
      } catch {
        toast.error(t('chat.failedUpload'));
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const text = input.trim();
    onSend(text, uploadedAttachment);
    setInput('');
    removeAttachment();

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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isDisabled = isSending || isUploading;
  const canSend = (input.trim() || attachment) && !isDisabled;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Daily limit countdown */}
        {rateLimitResetsAt && countdown && (
          <div className="flex items-center justify-between gap-2 mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs sm:text-sm text-destructive">
                {t('chat.dailyLimitReached')} <span className="font-mono font-semibold">{countdown}</span>
              </p>
            </div>
            <a
              href="/dashboard/upgrade"
              className="text-xs font-medium text-destructive hover:underline shrink-0"
            >
              {t('chat.upgrade')}
            </a>
          </div>
        )}

        {/* Composer container */}
        <div className={cn(
          'relative rounded-2xl border bg-background transition-all duration-200',
          'shadow-sm hover:shadow-md',
          'focus-within:border-ring focus-within:shadow-md',
          'focus-within:ring-2 focus-within:ring-ring/20',
        )}>
          {/* Attachment preview */}
          {attachment && (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-4 p-2 rounded-xl bg-muted/50 border border-border/50">
                {attachment.isImage && attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.file.name}
                    className="h-12 w-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={removeAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              attachment
                ? t('chat.placeholder.withAttachment')
                : chat.mode === 'chat'
                ? t('chat.placeholder.chat')
                : chat.mode === 'agent'
                ? t('chat.placeholder.agent')
                : t('chat.placeholder.default')
            }
            className={cn(
              'w-full min-h-[52px] max-h-40 resize-none border-none bg-transparent',
              'px-4 pt-4 pb-12 text-sm',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-0',
            )}
            disabled={isDisabled}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_TYPES}
            className="sr-only"
            onChange={handleFileSelect}
          />

          {/* Bottom bar inside composer */}
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 transition-colors',
                  attachment
                    ? 'text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={isDisabled}
              >
                {attachment ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg transition-all',
                canSend
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isUploading || isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-2">
          {t('chat.disclaimer')}
        </p>
      </div>
    </div>
  );
}

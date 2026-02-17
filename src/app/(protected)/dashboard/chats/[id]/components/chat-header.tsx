'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentStatusBadge } from '@/components/ui/agent-status-badge';
import { toast } from 'sonner';
import type { Chat } from '@/lib/supabase/types';

interface ChatHeaderProps {
  chat: Chat;
  onChatUpdate: (chat: Chat) => void;
  onDelete: () => void;
  onSearchToggle: () => void;
}

export function ChatHeader({ chat, onChatUpdate, onDelete, onSearchToggle }: ChatHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title || '');

  const handleRename = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setIsEditing(false);
      setEditTitle(chat.title || '');
      return;
    }
    if (trimmed === chat.title) {
      setIsEditing(false);
      return;
    }

    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const result = await res.json();
      if (result.success) {
        onChatUpdate({ ...chat, title: trimmed });
        toast.success('Chat renamed');
      } else {
        toast.error('Failed to rename chat');
      }
    } catch {
      toast.error('Failed to rename chat');
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(chat.title || '');
    }
  };

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => router.push('/dashboard/chats')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleRename}
                autoFocus
                className="h-8 text-sm font-semibold"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRename}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(chat.title || '');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">
                {chat.title || 'New Chat'}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {chat.mode === 'chat' ? 'AI Chat' : chat.mode === 'agent' ? 'Agent' : 'Auto'}
                </span>
                <AgentStatusBadge compact />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onSearchToggle}>
          <Search className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setEditTitle(chat.title || '');
              setIsEditing(true);
            }}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

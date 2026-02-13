/**
 * Agent Status Badge Component
 *
 * Displays the desktop agent's online status and current mode.
 * Shows a status indicator with mode label.
 */

'use client';

import { cn } from '@/lib/utils';
import { useAgentStatus } from '@/hooks/use-agent-status';
import { Monitor, MonitorOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentStatusBadgeProps {
  compact?: boolean;
  className?: string;
}

const MODE_LABELS: Record<string, string> = {
  chat: 'Chat',
  agent: 'Agent',
  auto: 'Auto',
};

const MODE_COLORS: Record<string, { online: string; offline: string }> = {
  chat: {
    online: 'bg-[#7ec4e3]/20 text-[#7ec4e3]',
    offline: 'bg-muted text-muted-foreground',
  },
  agent: {
    online: 'bg-[#7eea9b]/20 text-[#7eea9b]',
    offline: 'bg-muted text-muted-foreground',
  },
  auto: {
    online: 'bg-[#f2b76c]/20 text-[#f2b76c]',
    offline: 'bg-muted text-muted-foreground',
  },
};

export function AgentStatusBadge({ compact = false, className }: AgentStatusBadgeProps) {
  const { isOnline, mode, lastSeen, isLoading } = useAgentStatus();

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
        {!compact && <span className="text-xs text-muted-foreground">Checking...</span>}
      </div>
    );
  }

  const lastSeenText = lastSeen
    ? `Last seen: ${new Date(lastSeen).toLocaleTimeString()}`
    : 'Never connected';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            {/* Status icon */}
            {isOnline ? (
              <Monitor className="w-4 h-4 text-green-500" />
            ) : (
              <MonitorOff className="w-4 h-4 text-muted-foreground" />
            )}

            {/* Status dot */}
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isOnline ? 'bg-green-500' : 'bg-red-500'
              )}
            />

            {/* Status text */}
            {!compact && (
              <span className="text-xs text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}

            {/* Mode badge (shown always, dimmed when offline) */}
            <span
              className={cn(
                'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                MODE_COLORS[mode]?.[isOnline ? 'online' : 'offline'] || MODE_COLORS.chat.offline
              )}
            >
              {MODE_LABELS[mode] || 'Chat'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p className="font-medium">
              Desktop Agent: {isOnline ? 'Online' : 'Offline'}
            </p>
            <p>
              {isOnline ? 'Mode' : 'Last mode'}: {MODE_LABELS[mode] || 'Chat'}
            </p>
            <p className="text-muted-foreground">{lastSeenText}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AgentStatusBadge;

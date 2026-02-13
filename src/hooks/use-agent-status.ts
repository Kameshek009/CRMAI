/**
 * useAgentStatus Hook
 *
 * Checks if the desktop agent is online and what mode it's in.
 *
 * ARCHITECTURE:
 * - Uses /api/agent/status API route (server-side auth, bypasses RLS)
 * - Connects to /api/agent/status/stream SSE for instant updates
 * - Falls back to polling if SSE unavailable
 *
 * This replaces direct Supabase access which was blocked by RLS.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

type AgentMode = 'chat' | 'agent' | 'auto';

interface AgentStatus {
  online: boolean;
  mode: AgentMode;
  lastSeen: string | null;
  version: string | null;
}

interface UseAgentStatusReturn {
  isOnline: boolean;
  mode: AgentMode;
  lastSeen: string | null;
  version: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Poll interval when SSE is not connected (5 seconds for responsive updates)
const POLL_INTERVAL_MS = 5 * 1000;

// SSE reconnect delay
const SSE_RECONNECT_DELAY_MS = 3 * 1000;

export function useAgentStatus(): UseAgentStatusReturn {
  const [status, setStatus] = useState<AgentStatus>({
    online: false,
    mode: 'chat',
    lastSeen: null,
    version: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Fetch status from API route
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/status');
      const result = await response.json();

      if (!mountedRef.current) return;

      if (result.success && result.data) {
        setStatus({
          online: result.data.online,
          mode: result.data.mode || 'chat',
          lastSeen: result.data.lastSeen,
          version: result.data.version,
        });
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch agent status');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[useAgentStatus] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch status'));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Connect to SSE stream for instant updates
   */
  const connectSSE = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const eventSource = new EventSource('/api/agent/status/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[useAgentStatus] SSE connected');
        // Stop polling when SSE is connected
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      eventSource.addEventListener('status', (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          setStatus({
            online: data.online,
            mode: data.mode || 'chat',
            lastSeen: data.lastSeen,
            version: data.version,
          });
          setError(null);
          setIsLoading(false);
        } catch (err) {
          console.error('[useAgentStatus] Failed to parse SSE event:', err);
        }
      });

      eventSource.addEventListener('connected', (event) => {
        console.log('[useAgentStatus] SSE stream ready');
        // Parse initial status from connected event
        try {
          const data = JSON.parse(event.data);
          if (data.status) {
            setStatus({
              online: data.status.online,
              mode: data.status.mode || 'chat',
              lastSeen: data.status.lastSeen,
              version: data.status.version,
            });
            setError(null);
            setIsLoading(false);
          }
        } catch {
          // Connected event may not have status
        }
      });

      eventSource.onerror = () => {
        console.warn('[useAgentStatus] SSE connection error, falling back to polling');
        eventSource.close();
        eventSourceRef.current = null;

        if (!mountedRef.current) return;

        // Start polling as fallback
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
        }

        // Try to reconnect SSE after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connectSSE();
          }
        }, SSE_RECONNECT_DELAY_MS);
      };
    } catch (err) {
      console.error('[useAgentStatus] Failed to create EventSource:', err);
      // Fall back to polling
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
      }
    }
  }, [fetchStatus]);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  // Initial fetch and setup
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchStatus();

    // Try to connect SSE for instant updates
    connectSSE();

    // Cleanup
    return () => {
      mountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [fetchStatus, connectSSE]);

  return {
    isOnline: status.online,
    mode: status.mode,
    lastSeen: status.lastSeen,
    version: status.version,
    isLoading,
    error,
    refetch,
  };
}

export default useAgentStatus;

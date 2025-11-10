import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { invoke } from '@/core/tauri/invoke';

/**
 * Maximum number of log lines to keep in memory
 * Older lines are automatically discarded (FIFO)
 */
const MAX_LOG_LINES = 5000;

/**
 * Maximum number of seen log lines to track
 * Prevents unbounded memory growth
 */
const MAX_SEEN_LOG_LINES = 10000;

/**
 * Polling interval in milliseconds (3 seconds)
 */
const POLLING_INTERVAL = 3000;

function trimLogsToLimit(logs: string[], maxLines: number): string[] {
  if (logs.length <= maxLines) {
    return logs;
  }
  // Keep only the last maxLines
  return logs.slice(logs.length - maxLines);
}

export function useContainerLogs(containerId?: string, enabled = true) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Use ref to track if component is mounted
  const isMounted = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track last seen logs to filter old ones after clear
  const lastSeenLogsRef = useRef<Set<string>>(new Set());
  const seenQueueRef = useRef<string[]>([]);
  const clearTimestampRef = useRef<number>(0);

  const fetchLogs = useCallback(async () => {
    if (!containerId || !enabled) {
      console.log('❌ Logs fetch skipped:', { containerId, enabled });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Call Tauri command to get logs
      const logsString = await invoke<string>('get_container_logs', {
        containerId,
        tailLines: 500, // Get last 500 lines
      });

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, skipping update');
        return;
      }

      // Split logs into lines and filter empty lines
      const logLines = logsString
        .split('\n')
        .filter((line) => line.trim().length > 0);

      // If clear was called, only show new logs that weren't seen before clear
      const filteredLines = logLines.filter((line) => {
        // If we have a clear timestamp, only show new logs
        if (clearTimestampRef.current > 0) {
          // Check if this log was seen before the clear
          const wasSeenBeforeClear = lastSeenLogsRef.current.has(line);
          return !wasSeenBeforeClear;
        }
        return true;
      });

      // Trim to max limit
      const trimmedLogs = trimLogsToLimit(filteredLines, MAX_LOG_LINES);

      setLogs(trimmedLogs);

      // Update last seen logs with cap
      logLines.forEach((line) => {
        if (!lastSeenLogsRef.current.has(line)) {
          lastSeenLogsRef.current.add(line);
          seenQueueRef.current.push(line);
          if (seenQueueRef.current.length > MAX_SEEN_LOG_LINES) {
            const oldest = seenQueueRef.current.shift();
            if (oldest) lastSeenLogsRef.current.delete(oldest);
          }
        }
      });

      setError(null);
      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;

      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Error fetching logs:', errorMessage);
      setError(errorMessage);
      setLoading(false);

      // Show toast only on first error or if error changes
      if (error !== errorMessage) {
        toast.error('Failed to fetch logs', {
          description: errorMessage,
        });
      }

      // Stop polling on error (container might be stopped)
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [containerId, enabled, error]);

  const startPolling = useCallback(() => {
    if (!containerId || !enabled || isPolling) {
      return;
    }

    setIsPolling(true);
    setLoading(true);

    // Fetch immediately
    fetchLogs();

    // Then poll every POLLING_INTERVAL
    intervalRef.current = setInterval(() => {
      fetchLogs();
    }, POLLING_INTERVAL);
  }, [containerId, enabled, isPolling, fetchLogs]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    lastSeenLogsRef.current.clear();
    seenQueueRef.current = [];
    clearTimestampRef.current = Date.now();
    console.log('🗑️ Logs cleared and history reset');
  }, []);

  useEffect(() => {
    isMounted.current = true;

    if (containerId && enabled) {
      startPolling();
    }

    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, [containerId, enabled]);

  return {
    logs,
    loading,
    error,
    isPolling,
    clearLogs,
    startPolling,
    stopPolling,
    refetch: fetchLogs,
  };
}

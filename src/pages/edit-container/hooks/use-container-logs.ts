import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { invoke } from '@/core/tauri/invoke';

/**
 * Maximum number of log lines to keep in memory
 * Older lines are automatically discarded (FIFO)
 */
const MAX_LOG_LINES = 5000;

/**
 * Polling interval in milliseconds (3 seconds)
 */
const POLLING_INTERVAL = 3000;

/**
 * Helper function to trim logs array to maximum limit
 * Keeps the most recent lines, discards oldest
 */
function trimLogsToLimit(logs: string[], maxLines: number): string[] {
  if (logs.length <= maxLines) {
    return logs;
  }
  // Keep only the last maxLines
  return logs.slice(logs.length - maxLines);
}

/**
 * Hook to fetch and poll container logs
 *
 * Features:
 * - Auto-polling every 3 seconds
 * - Automatic cleanup on unmount
 * - Maximum 5000 lines in memory (FIFO)
 * - Error handling with toast notifications
 *
 * @param containerId - Docker container ID to fetch logs from
 * @param enabled - Whether polling should be active (default: true)
 * @returns logs state, loading state, error state, and control functions
 */
export function useContainerLogs(containerId?: string, enabled = true) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Use ref to track if component is mounted
  const isMounted = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track last seen logs to filter old ones after clear
  const lastSeenLogsRef = useRef<Set<string>>(new Set());
  const clearTimestampRef = useRef<number>(0);

  /**
   * Fetch logs from backend
   */
  const fetchLogs = useCallback(async () => {
    if (!containerId || !enabled) {
      console.log('❌ Logs fetch skipped:', { containerId, enabled });
      return;
    }

    console.log('📡 Fetching logs for container:', containerId);

    try {
      // Call Tauri command to get logs
      const logsString = await invoke<string>('get_container_logs', {
        containerId,
        tailLines: 500, // Get last 500 lines
      });

      console.log('✅ Logs fetched, length:', logsString.length);

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, skipping update');
        return;
      }

      // Split logs into lines and filter empty lines
      const logLines = logsString
        .split('\n')
        .filter((line) => line.trim().length > 0);

      console.log('📝 Log lines processed:', logLines.length);

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

      console.log('🔍 Filtered lines after clear:', filteredLines.length);

      // Trim to max limit
      const trimmedLogs = trimLogsToLimit(filteredLines, MAX_LOG_LINES);

      console.log('💾 Setting logs state with', trimmedLogs.length, 'lines');
      setLogs(trimmedLogs);

      // Update last seen logs (add all current logs to the set)
      logLines.map((line) => lastSeenLogsRef.current.add(line));

      setError(null);
      setLoading(false);
      console.log(
        '✅ State updated: loading=false, logs count=',
        trimmedLogs.length,
      );
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

  /**
   * Start polling for logs
   */
  const startPolling = useCallback(() => {
    if (!containerId || !enabled || isPolling) {
      return;
    }

    setIsPolling(true);

    // Fetch immediately
    fetchLogs();

    // Then poll every POLLING_INTERVAL
    intervalRef.current = setInterval(() => {
      fetchLogs();
    }, POLLING_INTERVAL);
  }, [containerId, enabled, isPolling, fetchLogs]);

  /**
   * Stop polling for logs
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Clear logs from display (doesn't affect Docker logs)
   * After clear, only new logs will be shown
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
    // Mark timestamp when clear was called
    clearTimestampRef.current = Date.now();
    // Keep track of all logs seen up to this point
    console.log(
      '🗑️ Logs cleared, tracking',
      lastSeenLogsRef.current.size,
      'old logs',
    );
  }, []);

  /**
   * Start polling on mount if enabled
   */
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

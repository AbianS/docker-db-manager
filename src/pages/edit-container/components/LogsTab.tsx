import { ArrowDown, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import type { Container } from '@/shared/types/container';
import { useContainerLogs } from '../hooks/use-container-logs';

interface LogsTabProps {
  container: Container;
}

export function LogsTab({ container }: LogsTabProps) {
  const { logs, loading, clearLogs } = useContainerLogs(
    container.containerId,
    container.status === 'running', // Only poll if container is running
  );

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);

  /**
   * Auto-scroll to bottom when new logs arrive (only if autoScroll is enabled)
   */
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  /**
   * Detect manual scroll and disable auto-scroll
   */
  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold

    if (!isAtBottom && autoScroll) {
      // User scrolled up, disable auto-scroll
      setAutoScroll(false);
      setUserScrolled(true);
    } else if (isAtBottom && !autoScroll) {
      // User scrolled to bottom, keep auto-scroll disabled until they click the button
      setUserScrolled(true);
    }
  };

  /**
   * Enable auto-scroll and scroll to bottom
   */
  const handleEnableAutoScroll = () => {
    setAutoScroll(true);
    setUserScrolled(false);
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Clear logs from display
   */
  const handleClearLogs = () => {
    clearLogs();
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Compact toolbar */}
      <div className="flex-shrink-0 px-4 py-2 bg-card/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {container.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll button (shown when disabled) */}
          {userScrolled && !autoScroll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnableAutoScroll}
              className="h-7 px-2 text-xs"
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Follow
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="h-7 px-2 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Logs display area */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4"
      >
        {!container.containerId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Container ID not available</p>
              <p className="text-xs mt-1">Container may not be running</p>
            </div>
          </div>
        ) : loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">
              No logs available yet
            </p>
          </div>
        ) : (
          <div className="font-mono text-xs space-y-0 leading-relaxed">
            {logs.map((log, index) => (
              <div
                key={`${index}-${log.substring(0, 20)}`}
                className="whitespace-pre-wrap break-all text-foreground/80"
              >
                {log}
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

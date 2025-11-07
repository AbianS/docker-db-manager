import { useCallback, useState } from 'react';
import { invoke } from '@/core/tauri/invoke';

interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface TerminalHistoryEntry {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: Date;
}

/**
 * Maximum number of commands to keep in history
 * Prevents memory leaks from long terminal sessions
 */
const MAX_HISTORY = 100;

export function useContainerTerminal(containerId?: string) {
  const [history, setHistory] = useState<TerminalHistoryEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeCommand = useCallback(
    async (command: string, columns: number = 80): Promise<CommandOutput> => {
      if (!containerId) {
        throw new Error('Container ID is required');
      }

      if (!command.trim()) {
        throw new Error('Command cannot be empty');
      }

      setIsExecuting(true);

      try {
        // Call Tauri backend to execute command with terminal width
        const result = await invoke<CommandOutput>(
          'execute_container_command',
          {
            containerId,
            command: command.trim(),
            columns,
          },
        );

        // Add to history
        const entry: TerminalHistoryEntry = {
          command: command.trim(),
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timestamp: new Date(),
        };

        setHistory((prev) => {
          const newHistory = [...prev, entry];
          // Keep only last MAX_HISTORY entries (FIFO)
          if (newHistory.length > MAX_HISTORY) {
            return newHistory.slice(newHistory.length - MAX_HISTORY);
          }
          return newHistory;
        });

        return result;
      } catch (error) {
        console.error('Failed to execute command:', error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [containerId],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    executeCommand,
    isExecuting,
    history,
    clearHistory,
  };
}

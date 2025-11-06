import { useCallback, useState } from 'react';
import { invoke } from '@/core/tauri/invoke';

/**
 * Response from execute_container_command Tauri command
 */
interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Single command execution entry in history
 */
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

/**
 * Hook to execute commands in a Docker container
 * 
 * Features:
 * - Execute single commands via docker exec
 * - Track command history (last 100 commands)
 * - Handle errors and stderr
 * - Loading state during execution
 * 
 * @param containerId - Docker container ID to execute commands in
 * @returns Hook functions and state
 */
export function useContainerTerminal(containerId?: string) {
  const [history, setHistory] = useState<TerminalHistoryEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Execute a command in the container
   * Calls the Tauri backend to run docker exec
   * 
   * @param command - Command string to execute
   * @returns Command output with stdout, stderr, and exit code
   */
  const executeCommand = useCallback(
    async (command: string): Promise<CommandOutput> => {
      if (!containerId) {
        throw new Error('Container ID is required');
      }

      if (!command.trim()) {
        throw new Error('Command cannot be empty');
      }

      setIsExecuting(true);

      try {
        // Call Tauri backend to execute command
        const result = await invoke<CommandOutput>('execute_container_command', {
          containerId,
          command: command.trim(),
        });

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

  /**
   * Clear command history
   * Useful when switching containers or resetting terminal
   */
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

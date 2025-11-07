import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef, useState } from 'react';
import type { Container } from '@/shared/types/container';
import { useContainerTerminal } from '../hooks/use-container-terminal';

interface TerminalTabProps {
  container: Container;
}

export function TerminalTab({ container }: TerminalTabProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>('');
  const { executeCommand, isExecuting } = useContainerTerminal(
    container.containerId,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js terminal
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 12,
      theme: {
        background: 'transparent',
        foreground: 'rgba(255, 255, 255, 0.8)',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowProposedApi: true,
      scrollback: 1000,
    });

    // Initialize FitAddon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Mount terminal to DOM
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Welcome message
    terminal.writeln('\x1b[1;32mDocker Container Terminal\x1b[0m');
    terminal.writeln(
      `\x1b[90mContainer: ${container.name} (${container.containerId?.slice(0, 12)})\x1b[0m`,
    );
    terminal.writeln('');

    // Show initial prompt
    writePrompt(terminal);
    setIsReady(true);

    // Handle user input
    terminal.onData((data) => {
      const code = data.charCodeAt(0);

      // Enter key (execute command)
      if (code === 13) {
        const command = currentLineRef.current.trim();
        terminal.write('\r\n');

        if (command) {
          executeCommandInTerminal(terminal, command);
        } else {
          writePrompt(terminal);
        }

        currentLineRef.current = '';
      }
      // Backspace key
      else if (code === 127) {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
      }
      // Ctrl+C (interrupt)
      else if (code === 3) {
        terminal.write('^C\r\n');
        currentLineRef.current = '';
        writePrompt(terminal);
      }
      // Ctrl+L (clear screen)
      else if (code === 12) {
        terminal.clear();
        terminal.writeln('\x1b[1;32mDocker Container Terminal\x1b[0m');
        terminal.writeln(
          `\x1b[90mContainer: ${container.name} (${container.containerId?.slice(0, 12)})\x1b[0m`,
        );
        terminal.writeln('');
        currentLineRef.current = '';
        writePrompt(terminal);
      }
      // Regular character
      else if (code >= 32 && code <= 126) {
        currentLineRef.current += data;
        terminal.write(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [container.containerId, container.name]);

  /**
   * Write command prompt
   */
  const writePrompt = (terminal: Terminal) => {
    terminal.write(`\x1b[1;36m$\x1b[0m `);
  };

  /**
   * Execute command and display output in terminal
   */
  const executeCommandInTerminal = async (
    terminal: Terminal,
    command: string,
  ) => {
    try {
      // Get current terminal columns for proper formatting
      const columns = terminal.cols;
      const result = await executeCommand(command, columns);

      // Write stdout in normal color
      if (result.stdout) {
        terminal.write(result.stdout.replace(/\n/g, '\r\n'));
        if (!result.stdout.endsWith('\n')) {
          terminal.write('\r\n');
        }
      }

      // Write stderr in red
      if (result.stderr) {
        terminal.write(
          `\x1b[1;31m${result.stderr.replace(/\n/g, '\r\n')}\x1b[0m`,
        );
        if (!result.stderr.endsWith('\n')) {
          terminal.write('\r\n');
        }
      }

      // Show exit code if non-zero
      if (result.exitCode !== 0) {
        terminal.write(`\x1b[1;31m[Exit code: ${result.exitCode}]\x1b[0m\r\n`);
      }

      // No stdout and no stderr but command succeeded
      if (!result.stdout && !result.stderr && result.exitCode === 0) {
        // Command executed successfully with no output
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      terminal.write(`\x1b[1;31mError: ${errorMessage}\x1b[0m\r\n`);
    } finally {
      writePrompt(terminal);
      // Scroll to bottom after command execution
      terminal.scrollToBottom();
    }
  };

  return (
    <div className="h-full flex flex-col bg-card p-4">
      <div ref={terminalRef} className="flex-1 overflow-hidden" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Loading terminal...</p>
          </div>
        </div>
      )}
    </div>
  );
}

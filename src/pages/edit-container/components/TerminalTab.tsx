import type { Container } from '@/shared/types/container';

interface TerminalTabProps {
  container: Container;
}

/**
 * Terminal tab component (placeholder)
 * Will allow executing commands directly in the container
 */
export function TerminalTab({ container }: TerminalTabProps) {
  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">Terminal</p>
          <p className="text-xs mt-2">Coming soon...</p>
          <p className="text-xs mt-1 text-muted-foreground/60">
            Execute commands in {container.name}
          </p>
        </div>
      </div>
    </div>
  );
}

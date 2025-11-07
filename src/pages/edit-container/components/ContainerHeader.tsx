import { Play, Square, Trash2 } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import type { Container } from '@/shared/types/container';

interface ContainerHeaderProps {
  container: Container;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}

export function ContainerHeader({
  container,
  onStart,
  onStop,
  onDelete,
}: ContainerHeaderProps) {
  const getStatusVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'running':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const isRunning = container.status === 'running';
  const isStopped = container.status === 'stopped';

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-border">
      <div className="flex items-start justify-between">
        {/* Left side: Container info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{container.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {container.dbType}
            </Badge>
            <Badge
              variant={getStatusVariant(container.status)}
              className="text-xs"
            >
              {container.status}
            </Badge>
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2 ml-4">
          {/* Start button - only shown when stopped */}
          {isStopped && (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onStart}
                  className="h-9 w-9"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Start Container</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Stop button - only shown when running */}
          {isRunning && (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onStop}
                  className="h-9 w-9"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Stop Container</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Delete button - always available but requires confirmation */}
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onDelete}
                className="h-9 w-9 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">Delete Container</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

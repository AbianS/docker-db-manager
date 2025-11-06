import { Terminal } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import type { Container } from '@/shared/types/container';
import {
  type ActionConfig,
  isActionAvailable,
} from '../utils/container-actions';

interface ContainerHeaderProps {
  container: Container;
}

/**
 * Header component for container detail view
 * Displays container name, type, status, and toolbar with global actions
 */
export function ContainerHeader({ container }: ContainerHeaderProps) {
  /**
   * Get visual styling for status badge based on container status
   */
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

  /**
   * Define available actions for the toolbar
   * Terminal action requires container to be running
   */
  const actions: ActionConfig[] = [
    {
      id: 'terminal',
      label: 'Terminal',
      icon: Terminal,
      requiresRunning: true, // Only available when container is running
      onClick: () => {
        // TODO: Implement terminal functionality in future
        console.log('Terminal action clicked');
      },
    },
  ];

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
            <Badge variant={getStatusVariant(container.status)} className="text-xs">
              {container.status}
            </Badge>
          </div>
        </div>

        {/* Right side: Toolbar with actions */}
        <div className="flex items-center gap-2 ml-4">
          {actions.map((action) => {
            const Icon = action.icon;
            const isAvailable = isActionAvailable(action, container.status);

            return (
              <Tooltip key={action.id} delayDuration={500}>
                <TooltipTrigger asChild>
                  <div style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={action.onClick}
                      disabled={!isAvailable}
                      className="h-9 w-9"
                      style={{
                        opacity: isAvailable ? 1 : 0.5,
                        pointerEvents: isAvailable ? 'auto' : 'none',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-center">
                    <p className="font-medium">{action.label}</p>
                    {!isAvailable && action.requiresRunning && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires running container
                      </p>
                    )}
                    {!isAvailable && action.requiresStopped && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires stopped container
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

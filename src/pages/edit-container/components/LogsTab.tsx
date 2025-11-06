import { ScrollText } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

/**
 * Logs tab placeholder component
 * Will be implemented in future with real container logs functionality
 */
export function LogsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <div className="p-4 rounded-full bg-muted/50">
          <ScrollText className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-lg font-semibold">Container Logs</h3>
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            View and analyze container logs in real-time
          </p>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {/* TODO: Implement logs functionality */}
          This feature will display container logs with filtering and search
          capabilities
        </div>
      </div>
    </div>
  );
}

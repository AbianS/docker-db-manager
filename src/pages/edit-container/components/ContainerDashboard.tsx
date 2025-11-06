import { Activity, Clock, Copy, Database, HardDrive, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Separator } from '@/shared/components/ui/separator';
import type { Container } from '@/shared/types/container';

interface ContainerDashboardProps {
  container: Container;
}

/**
 * Dashboard view for container detail
 * Displays overview information, connection string, settings, and stats placeholders
 */
export function ContainerDashboard({ container }: ContainerDashboardProps) {
  const provider = databaseRegistry.get(container.dbType);

  /**
   * Copy connection string to clipboard
   */
  const handleCopyConnectionString = async () => {
    if (!provider) return;

    const connectionString = provider.getConnectionString(container);

    try {
      await navigator.clipboard.writeText(connectionString);
      toast.success('Connection string copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error copying connection string');
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-4 px-6 pt-4 pb-6">
      {/* Quick Info Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Quick Info</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">
              {container.dbType} {container.version}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Port:</span>
            <Badge variant="outline" className="font-mono">
              {container.port}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status:</span>
            <Badge
              variant={
                container.status === 'running'
                  ? 'default'
                  : container.status === 'error'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {container.status}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {formatDate(container.createdAt)}
            </span>
          </div>
        </div>
      </Card>

      {/* Connection Section */}
      {provider && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Copy className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Connection</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={provider.getConnectionString(container)}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyConnectionString}
              className="flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Settings Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Settings</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Max Connections:</span>
            <span className="font-medium">{container.maxConnections}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Persist Data:</span>
            <Badge variant={container.persistData ? 'default' : 'secondary'}>
              {container.persistData ? 'Yes' : 'No'}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Auth Enabled:</span>
            <Badge variant={container.enableAuth ? 'default' : 'secondary'}>
              {container.enableAuth ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Container Stats Section - Placeholder */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Container Stats</h3>
          <Badge variant="secondary" className="text-xs ml-auto">
            Coming Soon
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* CPU Placeholder */}
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 border border-border">
            <Activity className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">CPU</span>
            <span className="text-sm font-medium text-muted-foreground">
              --%
            </span>
          </div>

          {/* Memory Placeholder */}
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 border border-border">
            <HardDrive className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">Memory</span>
            <span className="text-sm font-medium text-muted-foreground">
              -- MB
            </span>
          </div>

          {/* Uptime Placeholder */}
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 border border-border">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">Uptime</span>
            <span className="text-sm font-medium text-muted-foreground">
              --
            </span>
          </div>
        </div>
        {/* TODO: Implement real container stats in future */}
      </Card>
    </div>
  );
}

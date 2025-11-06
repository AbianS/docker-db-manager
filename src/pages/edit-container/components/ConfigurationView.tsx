import { databaseRegistry } from '@/features/databases/registry/database-registry';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import type { Container } from '@/shared/types/container';

interface ConfigurationViewProps {
  container: Container;
}

/**
 * Read-only view of container configuration
 * Displays all configuration details in a structured format
 */
export function ConfigurationView({ container }: ConfigurationViewProps) {
  const provider = databaseRegistry.get(container.dbType);

  /**
   * Mask password for display
   */
  const maskPassword = (password?: string) => {
    if (!password) return 'N/A';
    return '•'.repeat(8);
  };

  return (
    <div className="space-y-4 p-6">
      {/* Basic Configuration */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Basic Configuration</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{container.name}</span>
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
            <span className="text-muted-foreground">Version:</span>
            <span className="font-medium">{container.version}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Persist Data:</span>
            <Badge variant={container.persistData ? 'default' : 'secondary'}>
              {container.persistData ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Authentication */}
      {provider?.requiresAuth() && container.enableAuth && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Authentication</h3>
          <div className="space-y-2 text-sm">
            {container.username && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium font-mono">
                    {container.username}
                  </span>
                </div>
                <Separator />
              </>
            )}
            {container.password && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-medium font-mono">
                    {maskPassword(container.password)}
                  </span>
                </div>
                <Separator />
              </>
            )}
            {container.databaseName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Database Name:</span>
                <span className="font-medium font-mono">
                  {container.databaseName}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Advanced Configuration */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Advanced Configuration</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Max Connections:</span>
            <span className="font-medium">{container.maxConnections}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Container ID:</span>
            <span className="font-medium font-mono text-xs truncate max-w-[200px]">
              {container.containerId || 'N/A'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

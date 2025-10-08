export type ContainerStatus =
  | 'running'
  | 'stopped'
  | 'error'
  | 'creating'
  | 'removing';

export type DatabaseType = 'PostgreSQL' | 'MySQL' | 'Redis' | 'MongoDB';

/**
 * Container/Database representation
 * This is what gets stored and displayed
 */
export interface Container {
  id: string;
  name: string;
  dbType: DatabaseType;
  version: string;
  status: ContainerStatus;
  port: number;
  createdAt: Date;
  maxConnections: number;
  containerId?: string;
  username?: string;
  password?: string;
  databaseName?: string;
  persistData: boolean;
  enableAuth: boolean;
}

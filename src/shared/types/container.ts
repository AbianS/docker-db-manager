// REMOVED: Legacy ContainerSettings (now using provider-based system)

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

// REMOVED: Legacy CreateContainerRequest and UpdateContainerRequest
// Now using DockerRunRequest from features/databases/types/docker.types.ts with provider-based system

export interface ContainerError {
  error_type: string;
  message: string;
  port?: number;
  details?: string;
}

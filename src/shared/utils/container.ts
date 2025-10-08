import type {
  Container,
  ContainerStatus,
  DatabaseType,
} from '../types/container';

/**
 * Container utility functions
 * Only keeps functions that are still useful with the new provider-based system
 */

// ==================== Status Helpers ====================
export const isContainerRunning = (container: Container): boolean =>
  container.status === 'running';

export const isContainerStopped = (container: Container): boolean =>
  container.status === 'stopped';

export const canStartContainer = (container: Container): boolean =>
  container.status === 'stopped';

export const canStopContainer = (container: Container): boolean =>
  container.status === 'running';

export const canRemoveContainer = (container: Container): boolean =>
  container.status === 'stopped';

// ==================== Display Helpers ====================
export const getContainerIcon = (dbType: DatabaseType): string => {
  const icons = {
    PostgreSQL: '🐘',
    MySQL: '🐬',
    Redis: '🔴',
    MongoDB: '🍃',
  };
  return icons[dbType] || '🗄️';
};

export const getContainerStatusColor = (status: ContainerStatus): string => {
  const colors = {
    running: 'green',
    stopped: 'gray',
    error: 'red',
    creating: 'blue',
    removing: 'orange',
  };
  return colors[status] || 'gray';
};

// ==================== Data Transformation ====================
export const containerFromJSON = (data: any): Container => ({
  id: data.id,
  name: data.name,
  dbType: data.db_type,
  version: data.version,
  status: data.status,
  port: data.port,
  createdAt: new Date(data.created_at),
  maxConnections: data.max_connections,
  containerId: data.container_id,
  username: data.stored_username,
  password: data.stored_password,
  databaseName: data.stored_database_name,
  persistData: data.stored_persist_data,
  enableAuth: data.stored_enable_auth,
});

// REMOVED: createRequestToTauri, updateRequestToTauri
// Now using provider.buildDockerArgs() → genericContainersApi

// REMOVED: validateCreateRequest, validateUpdateRequest
// Now using provider.validateConfig()

// ==================== Connection Strings ====================
export const generateConnectionString = (container: Container): string => {
  const host = 'localhost';
  const port = container.port;
  const username = container.username || '';
  const password = container.password || '';
  const databaseName = container.databaseName || '';

  switch (container.dbType) {
    case 'PostgreSQL':
      return `postgresql://${username}:${password}@${host}:${port}/${databaseName}`;
    case 'MySQL':
      return `mysql://${username}:${password}@${host}:${port}/${databaseName}`;
    case 'MongoDB':
      return `mongodb://${username}:${password}@${host}:${port}/${databaseName}`;
    case 'Redis':
      return `redis://${password ? `:${password}@` : ''}${host}:${port}`;
    default:
      return '';
  }
};

// ==================== Clipboard ====================
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

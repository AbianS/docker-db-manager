import type {
  Container,
  ContainerStatus,
  DatabaseType,
} from '@/shared/types/container';

/**
 * Helper to create a mock Container object
 */
export function createMockContainer(
  overrides: Partial<Container> = {},
): Container {
  return {
    id: 'test-container-id',
    name: 'test-postgres',
    dbType: 'PostgreSQL' as DatabaseType,
    status: 'running' as ContainerStatus,
    port: 5432,
    version: '16',
    username: 'postgres',
    password: 'test-password',
    databaseName: 'testdb',
    persistData: true,
    enableAuth: true,
    maxConnections: 100,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create mock form configuration
 */
export function createMockFormConfig(dbType: string, overrides = {}) {
  const baseConfig = {
    name: `test-${dbType.toLowerCase()}`,
    port: 5432,
    version: '16',
    username: 'testuser',
    password: 'testpassword',
    databaseName: 'testdb',
    persistData: true,
    enableAuth: true,
  };

  return { ...baseConfig, ...overrides };
}

/**
 * Helper to validate DockerRunArgs structure
 */
export function validateDockerRunArgs(args: any): boolean {
  if (!args) return false;
  if (!args.image || typeof args.image !== 'string') return false;
  if (!args.envVars || typeof args.envVars !== 'object') return false;
  if (!Array.isArray(args.ports)) return false;
  if (!Array.isArray(args.volumes)) return false;
  if (!Array.isArray(args.command)) return false;

  // Validate ports structure
  for (const port of args.ports) {
    if (
      !port.host ||
      !port.container ||
      typeof port.host !== 'number' ||
      typeof port.container !== 'number'
    ) {
      return false;
    }
  }

  // Validate volumes structure
  for (const volume of args.volumes) {
    if (
      !volume.name ||
      !volume.path ||
      typeof volume.name !== 'string' ||
      typeof volume.path !== 'string'
    ) {
      return false;
    }
  }

  return true;
}

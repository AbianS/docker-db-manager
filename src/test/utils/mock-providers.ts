import type { DatabaseProvider } from '@/features/databases/registry/database-provider.interface';
import type {
  DockerRunArgs,
  ValidationResult,
} from '@/features/databases/types/docker.types';
import type {
  FieldGroup,
  FormField,
} from '@/features/databases/types/form.types';
import type { Container } from '@/shared/types/container';

/**
 * Mock Database Provider for testing
 * Implements a simple provider with all required methods
 */
export class MockDatabaseProvider implements DatabaseProvider {
  readonly id = 'MockDB';
  readonly name = 'Mock Database';
  readonly description = 'A mock database for testing';
  readonly icon = null;
  readonly color = '#000000';
  readonly defaultPort = 5000;
  readonly containerPort = 5000;
  readonly dataPath = '/data';
  readonly versions = ['1.0', '2.0', '3.0'];

  getBasicFields(): FormField[] {
    return [
      {
        name: 'name',
        label: 'Container Name',
        type: 'text',
        required: true,
      },
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        defaultValue: this.defaultPort,
        required: true,
      },
      {
        name: 'version',
        label: 'Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [];
  }

  buildDockerArgs(config: any): DockerRunArgs {
    return {
      image: `mockdb:${config.version}`,
      envVars: {
        MOCK_USER: config.username,
        MOCK_PASSWORD: config.password,
      },
      ports: [{ host: config.port, container: this.containerPort }],
      volumes: config.persistData
        ? [{ name: `${config.name}-data`, path: this.dataPath }]
        : [],
      command: [],
    };
  }

  getConnectionString(container: Container): string {
    return `mockdb://localhost:${container.port}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.username) {
      errors.push('Username is required');
    }

    if (!config.password || config.password.length < 4) {
      errors.push('Password must be at least 4 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  requiresAuth(): boolean {
    return true;
  }
}

/**
 * Create a mock provider with custom overrides
 */
export function createMockProvider(
  overrides: Partial<MockDatabaseProvider> = {},
): DatabaseProvider {
  const mock = new MockDatabaseProvider();
  return Object.assign(mock, overrides);
}

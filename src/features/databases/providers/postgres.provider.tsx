import { SiPostgresql } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type {
  DatabaseProvider,
  FieldsOptions,
} from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * PostgreSQL Database Provider
 * Implements all configuration for PostgreSQL databases
 */
export class PostgresDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'PostgreSQL';
  readonly name = 'PostgreSQL';
  readonly description = 'Advanced open-source relational database';
  readonly icon = <SiPostgresql className="w-6 h-6" />;
  readonly color = '#336791';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 5432;
  readonly containerPort = 5432;
  readonly dataPath = '/var/lib/postgresql/data';
  readonly versions = [
    // PostgreSQL 18
    '18.0',
    '18',
    '18-bookworm',
    '18-alpine3.22',
    '18-alpine3.21',
    '18-alpine',
    // PostgreSQL 17
    '17.6',
    '17',
    '17-bookworm',
    '17-alpine3.22',
    '17-alpine3.21',
    '17-alpine',
    // PostgreSQL 16
    '16.10',
    '16',
    '16-bookworm',
    '16-alpine3.22',
    '16-alpine3.21',
    '16-alpine',
    // PostgreSQL 15
    '15.14',
    '15',
    '15-bookworm',
    '15-alpine3.22',
    '15-alpine3.21',
    '15-alpine',
    // PostgreSQL 14
    '14.19',
    '14',
    '14-bookworm',
    '14-alpine3.22',
    '14-alpine3.21',
    '14-alpine',
    // PostgreSQL 13
    '13.22',
    '13',
    '13-bookworm',
    '13-alpine3.22',
    '13-alpine3.21',
    '13-alpine',
  ];

  // ==================== Form Fields ====================
  getBasicFields({ isEditMode = false }: FieldsOptions): FormField[] {
    return [
      {
        name: 'name',
        label: 'Container Name',
        type: 'text',
        required: true,
        placeholder: `my-${this.id.toLowerCase()}-db`,
        validation: {
          min: 3,
          message: 'Container name must be at least 3 characters',
        },
        helpText: 'Unique name for this container',
      },
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        defaultValue: this.defaultPort,
        required: true,
        placeholder: this.defaultPort.toString(),
        validation: {
          min: 1024,
          max: 65535,
          message: 'Port must be between 1024 and 65535',
        },
        helpText: `Host port to map to container port ${this.containerPort}`,
      },
      {
        name: 'version',
        label: 'PostgreSQL Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        readonly: isEditMode, // Version cannot be changed after creation
        helpText: isEditMode
          ? 'Version cannot be changed after creation'
          : 'Select the PostgreSQL version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        defaultValue: 'postgres',
        required: true,
        placeholder: 'Database superuser name',
        helpText: 'Default superuser for PostgreSQL',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Strong password',
        validation: {
          min: 4,
          message: 'Password must be at least 4 characters',
        },
        helpText: 'Password for the superuser account',
      },
      {
        name: 'databaseName',
        label: 'Initial Database',
        type: 'text',
        placeholder: 'my_database',
        helpText:
          'Optional: Create an initial database (defaults to "postgres")',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Authentication & Security',
        description: 'Configure how PostgreSQL handles authentication',
        fields: [
          {
            name: 'postgresSettings.hostAuthMethod',
            label: 'Host Authentication Method',
            type: 'select',
            options: ['md5', 'trust', 'scram-sha-256', 'password'],
            defaultValue: 'md5',
            helpText:
              'Authentication method for TCP/IP connections. md5 is recommended.',
          },
        ],
      },
      {
        label: 'Database Initialization',
        description: 'Advanced settings for database initialization',
        fields: [
          {
            name: 'postgresSettings.initdbArgs',
            label: 'INITDB Arguments',
            type: 'text',
            placeholder: '--encoding=UTF8 --locale=en_US.utf8',
            helpText:
              'Additional arguments passed to initdb during initialization',
          },
          {
            name: 'postgresSettings.sharedPreloadLibraries',
            label: 'Shared Preload Libraries',
            type: 'text',
            placeholder: 'pg_stat_statements',
            helpText:
              'Comma-separated list of extensions to preload on startup',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {
      POSTGRES_PASSWORD: config.password,
    };

    // Username (only if not default)
    if (config.username && config.username !== 'postgres') {
      envVars.POSTGRES_USER = config.username;
    }

    // Database name
    if (config.databaseName) {
      envVars.POSTGRES_DB = config.databaseName;
    }

    // Advanced settings
    if (config.postgresSettings?.hostAuthMethod) {
      envVars.POSTGRES_HOST_AUTH_METHOD =
        config.postgresSettings.hostAuthMethod;
    }

    if (config.postgresSettings?.initdbArgs) {
      envVars.POSTGRES_INITDB_ARGS = config.postgresSettings.initdbArgs;
    }

    if (config.postgresSettings?.sharedPreloadLibraries) {
      envVars.POSTGRES_SHARED_PRELOAD_LIBRARIES =
        config.postgresSettings.sharedPreloadLibraries;
    }

    return {
      image: `postgres:${config.version}`,
      envVars,
      ports: [{ host: config.port, container: this.containerPort }],
      volumes: config.persistData
        ? [{ name: `${config.name}-data`, path: this.dataPath }]
        : [],
      command: [],
    };
  }

  // ==================== Utilities ====================
  getConnectionString(container: Container): string {
    const username = container.username || 'postgres';
    const database = container.databaseName || 'postgres';
    return `postgresql://${username}:${container.password}@localhost:${container.port}/${database}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 4) {
      errors.push('Password must be at least 4 characters');
    }

    if (!config.version) {
      errors.push('PostgreSQL version is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultUsername(): string {
    return 'postgres';
  }

  requiresAuth(): boolean {
    return true;
  }
}

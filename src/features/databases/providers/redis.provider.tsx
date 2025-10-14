import { SiRedis } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type {
  DatabaseProvider,
  FieldsOptions,
} from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * Redis Database Provider
 * Implements all configuration for Redis databases
 */
export class RedisDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'Redis';
  readonly name = 'Redis';
  readonly description = 'In-memory data structure store';
  readonly icon = <SiRedis className="w-6 h-6" />;
  readonly color = '#DC382D';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 6379;
  readonly containerPort = 6379;
  readonly dataPath = '/data';
  readonly versions = [
    // Redis 8.2
    '8.2.2',
    '8.2',
    '8',
    '8-bookworm',
    '8.2-alpine',
    '8-alpine3.22',
    '8-alpine',
    // Redis 8.0
    '8.0.4',
    '8.0',
    '8.0-bookworm',
    '8.0-alpine',
    '8.0-alpine3.21',
    // Redis 7.4
    '7.4.6',
    '7.4',
    '7',
    '7-bookworm',
    '7.4-alpine',
    '7-alpine3.21',
    '7-alpine',
    // Redis 7.2
    '7.2.11',
    '7.2',
    '7.2-bookworm',
    '7.2-alpine',
    '7.2-alpine3.21',
    // Redis 6.2
    '6.2.20',
    '6.2',
    '6',
    '6-bookworm',
    '6.2-alpine',
    '6-alpine3.21',
    '6-alpine',
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
        label: 'Redis Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        readonly: isEditMode,
        helpText: isEditMode
          ? 'Version cannot be changed after creation'
          : 'Select the Redis version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: false,
        placeholder: 'Optional password',
        validation: {
          min: 4,
          message: 'Password must be at least 4 characters',
        },
        helpText:
          'Optional: Set a password for Redis. Leave empty for no authentication.',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Memory Management',
        description: 'Configure Redis memory usage and eviction policies',
        fields: [
          {
            name: 'redisSettings.maxMemory',
            label: 'Max Memory',
            type: 'text',
            defaultValue: '256mb',
            placeholder: '256mb, 1gb, 2gb',
            helpText:
              'Maximum memory Redis can use (e.g., 256mb, 1gb). Leave empty for unlimited.',
          },
          {
            name: 'redisSettings.maxMemoryPolicy',
            label: 'Eviction Policy',
            type: 'select',
            options: [
              'allkeys-lru',
              'volatile-lru',
              'allkeys-lfu',
              'volatile-lfu',
              'allkeys-random',
              'volatile-random',
              'volatile-ttl',
              'noeviction',
            ],
            defaultValue: 'allkeys-lru',
            helpText:
              'Policy for evicting keys when max memory is reached. LRU = Least Recently Used.',
          },
        ],
      },
      {
        label: 'Persistence',
        description: 'Configure data persistence options',
        fields: [
          {
            name: 'redisSettings.appendOnly',
            label: 'Enable AOF (Append Only File)',
            type: 'checkbox',
            defaultValue: false,
            helpText:
              'Enable append-only file for better durability. Logs every write operation.',
          },
          {
            name: 'redisSettings.save',
            label: 'RDB Snapshots',
            type: 'text',
            placeholder: '900 1 300 10 60 10000',
            helpText:
              'Save snapshots in pairs: seconds changes (e.g., "900 1 300 10" = save after 900s if 1+ keys changed, or after 300s if 10+ keys changed)',
          },
        ],
      },
      {
        label: 'Performance',
        description: 'Configure Redis performance settings',
        fields: [
          {
            name: 'redisSettings.maxClients',
            label: 'Max Clients',
            type: 'number',
            defaultValue: 10000,
            helpText: 'Maximum number of connected clients',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {};
    const command: string[] = ['redis-server'];

    // Password authentication
    if (config.password) {
      command.push('--requirepass', config.password);
    }

    // Memory settings
    if (config.redisSettings?.maxMemory) {
      command.push('--maxmemory', config.redisSettings.maxMemory);
    }

    if (config.redisSettings?.maxMemoryPolicy) {
      command.push('--maxmemory-policy', config.redisSettings.maxMemoryPolicy);
    }

    // Persistence
    if (config.redisSettings?.appendOnly) {
      command.push('--appendonly', 'yes');
    }

    if (config.redisSettings?.save) {
      // Split save pairs (e.g., "900 1 300 10" -> --save 900 1 --save 300 10)
      const tokens = String(config.redisSettings.save)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      // Push pairs: --save <seconds> <changes>
      for (let i = 0; i < tokens.length; i += 2) {
        const seconds = tokens[i];
        const changes = tokens[i + 1];
        if (seconds && changes) {
          command.push('--save', seconds, changes);
        }
      }
    }

    // Performance
    if (config.redisSettings?.maxClients) {
      command.push('--maxclients', config.redisSettings.maxClients.toString());
    }

    return {
      image: `redis:${config.version}`,
      envVars,
      ports: [{ host: config.port, container: this.containerPort }],
      volumes: config.persistData
        ? [{ name: `${config.name}-data`, path: this.dataPath }]
        : [],
      command,
    };
  }

  // ==================== Utilities ====================
  getConnectionString(container: Container): string {
    const auth = container.password ? `:${container.password}@` : '';
    return `redis://${auth}localhost:${container.port}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (config.password && config.password.length < 4) {
      errors.push('Password must be at least 4 characters if provided');
    }

    if (!config.version) {
      errors.push('Redis version is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultUsername(): string | undefined {
    return undefined; // Redis doesn't use username
  }

  requiresAuth(): boolean {
    return false; // Redis auth is optional
  }
}

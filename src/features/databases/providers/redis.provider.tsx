import { SiRedis } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type { DatabaseProvider } from '../registry/database-provider.interface';
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
  readonly versions = ['7.4', '7.2', '7.0', '6.2'];

  // ==================== Form Fields ====================
  getBasicFields(): FormField[] {
    return [
      {
        name: 'version',
        label: 'Redis Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        helpText: 'Select the Redis version to install',
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
              'Save snapshots: seconds changes (e.g., "900 1" = save after 900s if 1 key changed)',
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
      command.push('--save', config.redisSettings.save);
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

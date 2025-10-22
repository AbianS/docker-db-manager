import { SiMariadb } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type {
  DatabaseProvider,
  FieldsOptions,
} from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * MariaDB Database Provider
 * Implements all configuration for MariaDB databases
 */
export class MariaDBDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'MariaDB';
  readonly name = 'MariaDB';
  readonly description = 'Open-source MySQL-compatible relational database';
  readonly icon = <SiMariadb className="w-6 h-6" />;
  readonly color = '#003545';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 3306;
  readonly containerPort = 3306;
  readonly dataPath = '/var/lib/mysql';
  readonly versions = [
    // Latest
    'latest',
    'noble',
    'lts',
    'lts-noble',
    // MariaDB 12.1 RC
    '12.1.1-rc',
    '12.1-rc',
    '12.1.1-noble-rc',
    '12.1-noble-rc',
    // MariaDB 12.0
    '12.0.2',
    '12.0',
    '12',
    '12.0.2-noble',
    '12.0-noble',
    '12-noble',
    // MariaDB 11.8 (LTS)
    '11.8.3',
    '11.8',
    '11',
    '11.8.3-noble',
    '11.8-noble',
    '11-noble',
    // MariaDB 11.4
    '11.4.8',
    '11.4',
    '11.4.8-noble',
    '11.4-noble',
    // MariaDB 10.11 (LTS)
    '10.11.14',
    '10.11',
    '10',
    '10.11.14-jammy',
    '10.11-jammy',
    '10-jammy',
    // MariaDB 10.6
    '10.6.23',
    '10.6',
    '10.6.23-jammy',
    '10.6-jammy',
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
        label: 'MariaDB Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        readonly: isEditMode,
        helpText: isEditMode
          ? 'Version cannot be changed after creation'
          : 'Select the MariaDB version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        defaultValue: 'root',
        required: true,
        placeholder: 'Database root user',
        helpText: 'Root user for MariaDB',
      },
      {
        name: 'password',
        label: 'Root Password',
        type: 'password',
        required: true,
        placeholder: 'Strong password',
        validation: {
          min: 4,
          message: 'Password must be at least 4 characters',
        },
        helpText: 'Password for the root account',
      },
      {
        name: 'databaseName',
        label: 'Initial Database',
        type: 'text',
        placeholder: 'my_database',
        helpText: 'Optional: Create an initial database on startup',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Character Set & Collation',
        description: 'Configure default character encoding and collation',
        fields: [
          {
            name: 'mariadbSettings.characterSet',
            label: 'Character Set',
            type: 'select',
            options: ['utf8mb4', 'utf8', 'latin1', 'ascii'],
            defaultValue: 'utf8mb4',
            helpText:
              'Default character set. utf8mb4 is recommended for full Unicode support.',
          },
          {
            name: 'mariadbSettings.collation',
            label: 'Collation',
            type: 'select',
            options: [
              'utf8mb4_unicode_ci',
              'utf8mb4_general_ci',
              'utf8_unicode_ci',
              'utf8_general_ci',
              'latin1_swedish_ci',
            ],
            defaultValue: 'utf8mb4_unicode_ci',
            helpText: 'Default collation for string comparisons',
          },
        ],
      },
      {
        label: 'Connection & Performance',
        description: 'Configure connection limits and performance settings',
        fields: [
          {
            name: 'mariadbSettings.maxConnections',
            label: 'Max Connections',
            type: 'number',
            defaultValue: 151,
            validation: {
              min: 1,
              max: 100000,
            },
            helpText: 'Maximum number of simultaneous client connections',
          },
          {
            name: 'mariadbSettings.maxAllowedPacket',
            label: 'Max Allowed Packet (MB)',
            type: 'number',
            defaultValue: 16,
            validation: {
              min: 1,
              max: 1024,
            },
            helpText:
              'Maximum size of one packet or query result (in megabytes)',
          },
        ],
      },
      {
        label: 'SQL Mode',
        description: 'Configure SQL mode for strict or permissive behavior',
        fields: [
          {
            name: 'mariadbSettings.sqlMode',
            label: 'SQL Mode',
            type: 'select',
            options: [
              'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION',
              'TRADITIONAL',
              'ANSI',
              '',
            ],
            defaultValue:
              'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION',
            helpText:
              'SQL mode affects syntax and data validation (blank = permissive)',
          },
        ],
      },
      {
        label: 'Storage Engine',
        description: 'Configure default storage engine',
        fields: [
          {
            name: 'mariadbSettings.defaultStorageEngine',
            label: 'Default Storage Engine',
            type: 'select',
            options: ['InnoDB', 'MyISAM', 'Aria', 'Memory'],
            defaultValue: 'InnoDB',
            helpText:
              'Default storage engine for new tables. InnoDB is recommended.',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {
      MARIADB_ROOT_PASSWORD: config.password,
    };

    // Username (MariaDB uses root by default)
    if (config.username && config.username !== 'root') {
      envVars.MARIADB_USER = config.username;
      // If creating a new user, also need to set their password
      envVars.MARIADB_PASSWORD = config.password;
    }

    // Database name
    if (config.databaseName) {
      envVars.MARIADB_DATABASE = config.databaseName;
    }

    // Command arguments for advanced settings
    const command: string[] = [];

    // Character set
    if (config.mariadbSettings?.characterSet) {
      command.push(
        `--character-set-server=${config.mariadbSettings.characterSet}`,
      );
    }

    // Collation
    if (config.mariadbSettings?.collation) {
      command.push(`--collation-server=${config.mariadbSettings.collation}`);
    }

    // Max connections
    if (config.mariadbSettings?.maxConnections) {
      command.push(
        `--max-connections=${config.mariadbSettings.maxConnections}`,
      );
    }

    // Max allowed packet
    if (config.mariadbSettings?.maxAllowedPacket) {
      const bytes = config.mariadbSettings.maxAllowedPacket * 1024 * 1024;
      command.push(`--max-allowed-packet=${bytes}`);
    }

    // SQL Mode
    if (config.mariadbSettings?.sqlMode !== undefined) {
      command.push(`--sql-mode=${config.mariadbSettings.sqlMode}`);
    }

    // Default storage engine
    if (config.mariadbSettings?.defaultStorageEngine) {
      command.push(
        `--default-storage-engine=${config.mariadbSettings.defaultStorageEngine}`,
      );
    }

    return {
      image: `mariadb:${config.version}`,
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
    const username = container.username || 'root';
    const database = container.databaseName || 'mysql';
    return `mariadb://${username}:${container.password}@localhost:${container.port}/${database}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 4) {
      errors.push('Password must be at least 4 characters');
    }

    if (!config.version) {
      errors.push('MariaDB version is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultUsername(): string {
    return 'root';
  }

  requiresAuth(): boolean {
    return true;
  }
}

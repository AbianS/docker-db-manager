import { SiMysql } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type { DatabaseProvider } from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * MySQL Database Provider
 * Implements all configuration for MySQL databases
 */
export class MySQLDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'MySQL';
  readonly name = 'MySQL';
  readonly description = 'Popular open-source relational database';
  readonly icon = <SiMysql className="w-6 h-6" />;
  readonly color = '#4479A1';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 3306;
  readonly containerPort = 3306;
  readonly dataPath = '/var/lib/mysql';
  readonly versions = ['8.4', '8.0', '5.7'];

  // ==================== Form Fields ====================
  getBasicFields(): FormField[] {
    return [
      {
        name: 'version',
        label: 'MySQL Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        helpText: 'Select the MySQL version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Root Username',
        type: 'text',
        defaultValue: 'root',
        required: true,
        readonly: true,
        helpText: 'MySQL always uses "root" as the superuser',
      },
      {
        name: 'password',
        label: 'Root Password',
        type: 'password',
        required: true,
        placeholder: 'Strong password for root user',
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
        helpText: 'Optional: Create an initial database',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Connection Settings',
        description: 'Configure how MySQL handles remote connections',
        fields: [
          {
            name: 'mysqlSettings.rootHost',
            label: 'Root Host',
            type: 'text',
            defaultValue: '%',
            helpText: 'Host from which root can connect. "%" allows all hosts.',
          },
        ],
      },
      {
        label: 'Character Set & Collation',
        description: 'Configure default character encoding and collation',
        fields: [
          {
            name: 'mysqlSettings.characterSet',
            label: 'Character Set',
            type: 'select',
            options: ['utf8mb4', 'utf8', 'latin1'],
            defaultValue: 'utf8mb4',
            helpText: 'Default character set for databases',
          },
          {
            name: 'mysqlSettings.collation',
            label: 'Collation',
            type: 'text',
            defaultValue: 'utf8mb4_unicode_ci',
            helpText: 'Default collation for string comparisons',
          },
        ],
      },
      {
        label: 'SQL Mode',
        description: 'Configure SQL behavior and strictness',
        fields: [
          {
            name: 'mysqlSettings.sqlMode',
            label: 'SQL Mode',
            type: 'select',
            options: [
              'TRADITIONAL',
              'STRICT_TRANS_TABLES',
              'NO_ZERO_IN_DATE',
              'NO_ZERO_DATE',
              'ERROR_FOR_DIVISION_BY_ZERO',
              'NO_ENGINE_SUBSTITUTION',
            ],
            defaultValue: 'TRADITIONAL',
            helpText: 'SQL mode affects MySQL behavior',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {
      MYSQL_ROOT_PASSWORD: config.password,
    };

    // Database name
    if (config.databaseName) {
      envVars.MYSQL_DATABASE = config.databaseName;
    }

    // Advanced settings
    if (config.mysqlSettings?.rootHost) {
      envVars.MYSQL_ROOT_HOST = config.mysqlSettings.rootHost;
    }

    if (config.mysqlSettings?.characterSet) {
      envVars.MYSQL_CHARACTER_SET_SERVER = config.mysqlSettings.characterSet;
    }

    if (config.mysqlSettings?.collation) {
      envVars.MYSQL_COLLATION_SERVER = config.mysqlSettings.collation;
    }

    if (config.mysqlSettings?.sqlMode) {
      envVars.MYSQL_SQL_MODE = config.mysqlSettings.sqlMode;
    }

    return {
      image: `mysql:${config.version}`,
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
    const username = container.username || 'root';
    const database = container.databaseName || '';
    return `mysql://${username}:${container.password}@localhost:${container.port}/${database}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 4) {
      errors.push('Password must be at least 4 characters');
    }

    if (!config.version) {
      errors.push('MySQL version is required');
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

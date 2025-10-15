import { SiInfluxdb } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type {
  DatabaseProvider,
  FieldsOptions,
} from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * InfluxDB Database Provider
 * Implements all configuration for InfluxDB time-series databases
 */
export class InfluxDBDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'InfluxDB';
  readonly name = 'InfluxDB';
  readonly description = 'Time-series database for metrics and events';
  readonly icon = <SiInfluxdb className="w-6 h-6" />;
  readonly color = '#22ADF6';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 8086;
  readonly containerPort = 8086;
  readonly dataPath = '/var/lib/influxdb2';
  readonly versions = [
    // InfluxDB 3.x (Core and Enterprise)
    '3-core',
    '3.5-core',
    '3.5.0-core',
    'core',
    '3-enterprise',
    '3.5-enterprise',
    '3.5.0-enterprise',
    'enterprise',
    // InfluxDB 2.x (Latest)
    'latest',
    '2',
    '2.7',
    '2.7.12',
    'alpine',
    '2-alpine',
    '2.7-alpine',
    '2.7.12-alpine',
    // InfluxDB 1.12
    '1.12',
    '1.12.2',
    '1.12-alpine',
    '1.12.2-alpine',
    '1.12-data',
    '1.12.2-data',
    '1.12-data-alpine',
    '1.12.2-data-alpine',
    '1.12-meta',
    '1.12.2-meta',
    '1.12-meta-alpine',
    '1.12.2-meta-alpine',
    // InfluxDB 1.11
    '1.11',
    '1.11.8',
    '1.11-alpine',
    '1.11.8-alpine',
    '1.11-data',
    '1.11.9-data',
    '1.11-data-alpine',
    '1.11.9-data-alpine',
    '1.11-meta',
    '1.11.9-meta',
    '1.11-meta-alpine',
    '1.11.9-meta-alpine',
  ];

  // ==================== Form Fields ====================
  getBasicFields({ isEditMode = false }: FieldsOptions): FormField[] {
    return [
      {
        name: 'name',
        label: 'Container Name',
        type: 'text',
        required: true,
        placeholder: 'my-influxdb',
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
        label: 'InfluxDB Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        readonly: isEditMode,
        helpText: isEditMode
          ? 'Version cannot be changed after creation'
          : 'Select the InfluxDB version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        defaultValue: 'admin',
        required: true,
        placeholder: 'Admin username',
        helpText: 'Administrator username for InfluxDB',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Strong password',
        validation: {
          min: 8,
          message: 'Password must be at least 8 characters',
        },
        helpText: 'Password for the administrator account',
      },
      {
        name: 'influxdbSettings.org',
        label: 'Organization',
        type: 'text',
        defaultValue: 'myorg',
        required: true,
        placeholder: 'Organization name',
        helpText: 'Organization name (InfluxDB 2.x only)',
      },
      {
        name: 'influxdbSettings.bucket',
        label: 'Initial Bucket',
        type: 'text',
        defaultValue: 'mybucket',
        required: true,
        placeholder: 'Bucket name',
        helpText: 'Initial bucket/database name (InfluxDB 2.x only)',
      },
      {
        name: 'influxdbSettings.token',
        label: 'Admin Token',
        type: 'password',
        placeholder: 'Auto-generated if empty',
        helpText: 'Admin API token (optional, auto-generated if not provided)',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Retention Policy',
        description: 'Configure data retention settings',
        fields: [
          {
            name: 'influxdbSettings.retentionHours',
            label: 'Retention Period (hours)',
            type: 'number',
            defaultValue: 0,
            validation: {
              min: 0,
            },
            helpText:
              'Data retention period in hours (0 = infinite, InfluxDB 2.x only)',
          },
        ],
      },
      {
        label: 'HTTP Configuration',
        description: 'Configure HTTP server settings',
        fields: [
          {
            name: 'influxdbSettings.httpLogEnabled',
            label: 'Enable HTTP Request Logging',
            type: 'checkbox',
            defaultValue: true,
            helpText: 'Log HTTP requests to the server',
          },
        ],
      },
      {
        label: 'Monitoring',
        description: 'Configure monitoring and metrics',
        fields: [
          {
            name: 'influxdbSettings.metricsDisabled',
            label: 'Disable Metrics',
            type: 'checkbox',
            defaultValue: false,
            helpText: 'Disable internal metrics collection',
          },
        ],
      },
      {
        label: 'Performance',
        description: 'Configure performance settings',
        fields: [
          {
            name: 'influxdbSettings.storageWalMaxConcurrentWrites',
            label: 'Max Concurrent WAL Writes',
            type: 'number',
            defaultValue: 0,
            validation: {
              min: 0,
            },
            helpText: 'Maximum number of concurrent WAL writes (0 = unlimited)',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {};
    const command: string[] = [];

    // Check if version is 2.x or higher
    const isV2OrHigher =
      config.version.startsWith('2') ||
      config.version.startsWith('3') ||
      config.version === 'latest' ||
      config.version === 'alpine' ||
      config.version.includes('core') ||
      config.version.includes('enterprise');

    if (isV2OrHigher) {
      // InfluxDB 2.x/3.x configuration
      envVars.DOCKER_INFLUXDB_INIT_MODE = 'setup';
      envVars.DOCKER_INFLUXDB_INIT_USERNAME = config.username || 'admin';
      envVars.DOCKER_INFLUXDB_INIT_PASSWORD = config.password;
      envVars.DOCKER_INFLUXDB_INIT_ORG =
        config.influxdbSettings?.org || 'myorg';
      envVars.DOCKER_INFLUXDB_INIT_BUCKET =
        config.influxdbSettings?.bucket || 'mybucket';

      if (config.influxdbSettings?.token) {
        envVars.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN =
          config.influxdbSettings.token;
      }

      if (
        config.influxdbSettings?.retentionHours &&
        config.influxdbSettings.retentionHours > 0
      ) {
        envVars.DOCKER_INFLUXDB_INIT_RETENTION = `${config.influxdbSettings.retentionHours}h`;
      }

      // HTTP logging
      if (config.influxdbSettings?.httpLogEnabled === false) {
        envVars.INFLUXD_HTTP_LOG_ENABLED = 'false';
      }

      // Metrics
      if (config.influxdbSettings?.metricsDisabled) {
        envVars.INFLUXD_METRICS_DISABLED = 'true';
      }

      // WAL writes
      if (config.influxdbSettings?.storageWalMaxConcurrentWrites) {
        envVars.INFLUXD_STORAGE_WAL_MAX_CONCURRENT_WRITES =
          config.influxdbSettings.storageWalMaxConcurrentWrites.toString();
      }
    } else {
      // InfluxDB 1.x configuration
      envVars.INFLUXDB_DB = config.influxdbSettings?.bucket || 'mydb';
      envVars.INFLUXDB_ADMIN_USER = config.username || 'admin';
      envVars.INFLUXDB_ADMIN_PASSWORD = config.password;

      if (config.influxdbSettings?.httpLogEnabled === false) {
        envVars.INFLUXDB_HTTP_LOG_ENABLED = 'false';
      }
    }

    return {
      image: `influxdb:${config.version}`,
      envVars,
      ports: [{ host: config.port, container: this.containerPort }],
      volumes: config.persistData
        ? [
            {
              name: `${config.name}-data`,
              path: isV2OrHigher ? '/var/lib/influxdb2' : '/var/lib/influxdb',
            },
          ]
        : [],
      command,
    };
  }

  // ==================== Utilities ====================
  getConnectionString(container: Container): string {
    const username = container.username || 'admin';
    const org = 'myorg'; // Default organization
    return `http://${username}@localhost:${container.port}?org=${org}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!config.version) {
      errors.push('InfluxDB version is required');
    }

    // Check if version is 2.x or higher for certain validations
    const isV2OrHigher =
      config.version.startsWith('2') ||
      config.version.startsWith('3') ||
      config.version === 'latest' ||
      config.version === 'alpine' ||
      config.version.includes('core') ||
      config.version.includes('enterprise');

    if (isV2OrHigher) {
      if (!config.influxdbSettings?.org) {
        errors.push('Organization is required for InfluxDB 2.x and above');
      }

      if (!config.influxdbSettings?.bucket) {
        errors.push('Initial bucket is required for InfluxDB 2.x and above');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultUsername(): string {
    return 'admin';
  }

  requiresAuth(): boolean {
    return true;
  }
}

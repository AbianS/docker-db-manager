import { SiElasticsearch } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type {
  DatabaseProvider,
  FieldsOptions,
} from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * Elasticsearch Database Provider
 * Implements all configuration for Elasticsearch search and analytics engine
 */
export class ElasticsearchDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'Elasticsearch';
  readonly name = 'Elasticsearch';
  readonly description = 'Distributed search and analytics engine';
  readonly icon = <SiElasticsearch className="w-6 h-6" />;
  readonly color = '#005571';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 9200;
  readonly containerPort = 9200;
  readonly dataPath = '/usr/share/elasticsearch/data';
  readonly versions = [
    // Elasticsearch 9.x
    '9.1.5',
    '9.1',
    '9.0.8',
    '9.0',
    '9',
    // Elasticsearch 8.x
    '8.19.5',
    '8.19',
    '8.18.8',
    '8.18',
    '8.17.10',
    '8.17',
    '8',
    'latest',
  ];

  // ==================== Form Fields ====================
  getBasicFields({ isEditMode = false }: FieldsOptions): FormField[] {
    return [
      {
        name: 'name',
        label: 'Container Name',
        type: 'text',
        required: true,
        placeholder: 'my-elasticsearch',
        validation: {
          min: 3,
          message: 'Container name must be at least 3 characters',
        },
        helpText: 'Unique name for this container',
      },
      {
        name: 'port',
        label: 'HTTP Port',
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
        label: 'Elasticsearch Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        readonly: isEditMode,
        helpText: isEditMode
          ? 'Version cannot be changed after creation'
          : 'Select the Elasticsearch version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'elasticsearchSettings.securityEnabled',
        label: 'Enable Security',
        type: 'checkbox',
        defaultValue: true,
        helpText:
          'Enable security features (required for production). Username will be "elastic".',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Strong password',
        validation: {
          min: 6,
          message: 'Password must be at least 6 characters',
        },
        helpText: 'Password for the "elastic" superuser account',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Cluster Configuration',
        description: 'Configure cluster settings',
        fields: [
          {
            name: 'elasticsearchSettings.clusterName',
            label: 'Cluster Name',
            type: 'text',
            defaultValue: 'docker-cluster',
            helpText: 'Name of the Elasticsearch cluster',
          },
          {
            name: 'elasticsearchSettings.nodeName',
            label: 'Node Name',
            type: 'text',
            defaultValue: 'node-1',
            helpText: 'Name of this Elasticsearch node',
          },
          {
            name: 'elasticsearchSettings.discoveryType',
            label: 'Discovery Type',
            type: 'select',
            options: ['single-node', 'multi-node'],
            defaultValue: 'single-node',
            helpText:
              'Discovery type (use single-node for development, multi-node for production)',
          },
        ],
      },
      {
        label: 'Memory Settings',
        description: 'Configure JVM heap memory',
        fields: [
          {
            name: 'elasticsearchSettings.heapSize',
            label: 'Heap Size',
            type: 'select',
            options: ['512m', '1g', '2g', '4g', '8g'],
            defaultValue: '1g',
            helpText:
              'JVM heap size (should be 50% of available RAM, max 32GB)',
          },
        ],
      },
      {
        label: 'Network Configuration',
        description: 'Configure network settings',
        fields: [
          {
            name: 'elasticsearchSettings.transportPort',
            label: 'Transport Port',
            type: 'number',
            defaultValue: 9300,
            validation: {
              min: 1024,
              max: 65535,
            },
            helpText: 'Port for node-to-node communication',
          },
        ],
      },
      {
        label: 'Performance',
        description: 'Configure performance settings',
        fields: [
          {
            name: 'elasticsearchSettings.bootstrapMemoryLock',
            label: 'Bootstrap Memory Lock',
            type: 'checkbox',
            defaultValue: true,
            helpText:
              'Lock memory on startup to prevent swapping (recommended for performance)',
          },
        ],
      },
      {
        label: 'License',
        description: 'Configure license settings',
        fields: [
          {
            name: 'elasticsearchSettings.licenseType',
            label: 'License Type',
            type: 'select',
            options: ['basic', 'trial'],
            defaultValue: 'basic',
            helpText:
              'License type (basic is free, trial enables all features for 30 days)',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {
      'discovery.type':
        config.elasticsearchSettings?.discoveryType || 'single-node',
      'cluster.name':
        config.elasticsearchSettings?.clusterName || 'docker-cluster',
      'node.name': config.elasticsearchSettings?.nodeName || 'node-1',
    };

    // Heap size
    const heapSize = config.elasticsearchSettings?.heapSize || '1g';
    envVars.ES_JAVA_OPTS = `-Xms${heapSize} -Xmx${heapSize}`;

    // Security settings
    if (config.elasticsearchSettings?.securityEnabled !== false) {
      envVars.ELASTIC_PASSWORD = config.password;
      envVars['xpack.security.enabled'] = 'true';
      envVars['xpack.security.enrollment.enabled'] = 'true';
    } else {
      envVars['xpack.security.enabled'] = 'false';
    }

    // Bootstrap memory lock
    if (config.elasticsearchSettings?.bootstrapMemoryLock !== false) {
      envVars['bootstrap.memory_lock'] = 'true';
    }

    // License type
    if (config.elasticsearchSettings?.licenseType) {
      envVars['xpack.license.self_generated.type'] =
        config.elasticsearchSettings.licenseType;
    }

    // Ports configuration
    const ports = [{ host: config.port, container: this.containerPort }];

    // Add transport port if specified
    if (config.elasticsearchSettings?.transportPort) {
      ports.push({
        host: config.elasticsearchSettings.transportPort,
        container: 9300,
      });
    }

    return {
      image: `docker.elastic.co/elasticsearch/elasticsearch:${config.version}`,
      envVars,
      ports,
      volumes: config.persistData
        ? [{ name: `${config.name}-data`, path: this.dataPath }]
        : [],
      command: [],
    };
  }

  // ==================== Utilities ====================
  getConnectionString(container: Container): string {
    const username = 'elastic';
    // Default to https as security is enabled by default
    const protocol = 'https';
    return `${protocol}://${username}:${container.password}@localhost:${container.port}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!config.version) {
      errors.push('Elasticsearch version is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultUsername(): string {
    return 'elastic';
  }

  requiresAuth(): boolean {
    return true;
  }
}

import { SiMongodb } from 'react-icons/si';
import type { Container } from '@/shared/types/container';
import type { DatabaseProvider } from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * MongoDB Database Provider
 * Implements all configuration for MongoDB databases
 */
export class MongoDBDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'MongoDB';
  readonly name = 'MongoDB';
  readonly description = 'Document-oriented NoSQL database';
  readonly icon = <SiMongodb className="w-6 h-6" />;
  readonly color = '#47A248';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 27017;
  readonly containerPort = 27017;
  readonly dataPath = '/data/db';
  readonly versions = ['8.0', '7.0', '6.0', '5.0'];

  // ==================== Form Fields ====================
  getBasicFields(): FormField[] {
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
        label: 'MongoDB Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[0],
        required: true,
        helpText: 'Select the MongoDB version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Root Username',
        type: 'text',
        defaultValue: 'admin',
        required: true,
        placeholder: 'Database admin user',
        helpText: 'Username for the MongoDB admin user',
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
        helpText: 'Password for the admin account',
      },
      {
        name: 'databaseName',
        label: 'Initial Database',
        type: 'text',
        placeholder: 'my_database',
        helpText: 'Optional: Create an initial database (defaults to "admin")',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Authentication',
        description: 'Configure MongoDB authentication settings',
        fields: [
          {
            name: 'mongoSettings.authSource',
            label: 'Authentication Database',
            type: 'text',
            defaultValue: 'admin',
            helpText:
              'Database where user credentials are stored (usually "admin")',
          },
        ],
      },
      {
        label: 'Replication & Sharding',
        description: 'Configure replication and sharding features',
        fields: [
          {
            name: 'mongoSettings.enableSharding',
            label: 'Enable Sharding',
            type: 'checkbox',
            defaultValue: false,
            helpText:
              'Enable sharding for horizontal scaling (requires replica set)',
          },
          {
            name: 'mongoSettings.replicaSet',
            label: 'Replica Set Name',
            type: 'text',
            placeholder: 'rs0',
            helpText: 'Optional: Name of the replica set (enables replication)',
          },
        ],
      },
      {
        label: 'Storage',
        description: 'Configure storage engine and oplog settings',
        fields: [
          {
            name: 'mongoSettings.storageEngine',
            label: 'Storage Engine',
            type: 'select',
            options: ['wiredTiger', 'inMemory'],
            defaultValue: 'wiredTiger',
            helpText:
              'Storage engine to use. WiredTiger is the default and recommended.',
          },
          {
            name: 'mongoSettings.oplogSize',
            label: 'Oplog Size (MB)',
            type: 'number',
            defaultValue: 512,
            helpText:
              'Size of the operation log for replication (only for replica sets)',
          },
        ],
      },
      {
        label: 'Security',
        description: 'Additional security settings',
        fields: [
          {
            name: 'mongoSettings.directoryPerDB',
            label: 'Directory Per Database',
            type: 'checkbox',
            defaultValue: false,
            helpText:
              'Store each database in its own directory for better organization',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {
      MONGO_INITDB_ROOT_USERNAME: config.username || 'admin',
      MONGO_INITDB_ROOT_PASSWORD: config.password,
    };

    // Initial database
    if (config.databaseName) {
      envVars.MONGO_INITDB_DATABASE = config.databaseName;
    }

    // Command arguments for advanced settings
    const command: string[] = [];

    // Replica set
    if (config.mongoSettings?.replicaSet) {
      command.push('--replSet', config.mongoSettings.replicaSet);
    }

    // Storage engine
    if (config.mongoSettings?.storageEngine === 'inMemory') {
      command.push('--storageEngine', 'inMemory');
    }

    // Directory per DB
    if (config.mongoSettings?.directoryPerDB) {
      command.push('--directoryperdb');
    }

    // Oplog size (only for replica sets)
    if (config.mongoSettings?.replicaSet && config.mongoSettings?.oplogSize) {
      command.push('--oplogSize', config.mongoSettings.oplogSize.toString());
    }

    return {
      image: `mongo:${config.version}`,
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
    const username = container.username || 'admin';
    const database = container.databaseName || 'admin';
    const authSource = 'admin'; // MongoDB always authenticates against admin

    return `mongodb://${username}:${container.password}@localhost:${container.port}/${database}?authSource=${authSource}`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 4) {
      errors.push('Password must be at least 4 characters');
    }

    if (!config.version) {
      errors.push('MongoDB version is required');
    }

    if (!config.username) {
      errors.push('Username is required');
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

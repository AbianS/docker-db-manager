import { DiMsqlServer } from 'react-icons/di';
import type { Container } from '@/shared/types/container';
import type {
  DatabaseProvider,
  FieldsOptions,
} from '../registry/database-provider.interface';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * SQL Server Database Provider
 * Implements all configuration for Microsoft SQL Server databases
 */
export class SQLServerDatabaseProvider implements DatabaseProvider {
  // ==================== Identification ====================
  readonly id = 'SQLServer';
  readonly name = 'SQL Server';
  readonly description = 'Microsoft SQL Server relational database';
  readonly icon = <DiMsqlServer className="w-6 h-6" />;
  readonly color = '#CC2927';

  // ==================== Docker Configuration ====================
  readonly defaultPort = 1433;
  readonly containerPort = 1433;
  readonly dataPath = '/var/opt/mssql';
  readonly versions = [
    // SQL Server 2025 (Preview)
    '2025-latest',
    // SQL Server 2022
    '2022-latest',
    // SQL Server 2019
    '2019-latest',
    // SQL Server 2017
    '2017-latest',
  ];

  // ==================== Form Fields ====================
  getBasicFields({ isEditMode = false }: FieldsOptions): FormField[] {
    return [
      {
        name: 'name',
        label: 'Container Name',
        type: 'text',
        required: true,
        placeholder: 'my-sqlserver-db',
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
        label: 'SQL Server Version',
        type: 'select',
        options: this.versions,
        defaultValue: this.versions[1], // 2022-latest by default
        required: true,
        readonly: isEditMode,
        helpText: isEditMode
          ? 'Version cannot be changed after creation'
          : 'Select the SQL Server version to install',
      },
    ];
  }

  getAuthenticationFields(): FormField[] {
    return [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        defaultValue: 'sa',
        required: true,
        placeholder: 'System Administrator',
        helpText: 'Default system administrator for SQL Server',
      },
      {
        name: 'password',
        label: 'SA Password',
        type: 'password',
        required: true,
        placeholder: 'Strong password',
        validation: {
          min: 8,
          message:
            'Password must be at least 8 characters and meet complexity requirements',
        },
        helpText:
          'Password for SA account (must be strong: uppercase, lowercase, numbers, and symbols)',
      },
      {
        name: 'acceptEula',
        label: 'Accept EULA',
        type: 'checkbox',
        required: true,
        defaultValue: false,
        helpText:
          'You must accept the End-User Licensing Agreement to use SQL Server',
      },
    ];
  }

  getAdvancedFields(): FieldGroup[] {
    return [
      {
        label: 'Product & Licensing',
        description: 'Configure SQL Server edition and licensing',
        fields: [
          {
            name: 'sqlserverSettings.productId',
            label: 'Product ID / Edition',
            type: 'select',
            options: [
              'Developer',
              'Express',
              'Standard',
              'Enterprise',
              'EnterpriseCore',
            ],
            defaultValue: 'Developer',
            helpText:
              'Edition to use. Developer and Express are free for non-production use.',
          },
        ],
      },
      {
        label: 'Collation',
        description: 'Configure default collation settings',
        fields: [
          {
            name: 'sqlserverSettings.collation',
            label: 'Server Collation',
            type: 'select',
            options: [
              'SQL_Latin1_General_CP1_CI_AS',
              'Latin1_General_CI_AS',
              'Latin1_General_CS_AS',
              'SQL_Latin1_General_CP1_CS_AS',
            ],
            defaultValue: 'SQL_Latin1_General_CP1_CI_AS',
            helpText:
              'Default collation for the SQL Server instance (CI=Case Insensitive, CS=Case Sensitive)',
          },
        ],
      },
      {
        label: 'Memory Configuration',
        description: 'Configure memory limits for SQL Server',
        fields: [
          {
            name: 'sqlserverSettings.memoryLimitMb',
            label: 'Memory Limit (MB)',
            type: 'number',
            defaultValue: 2048,
            validation: {
              min: 512,
              max: 32768,
            },
            helpText:
              'Maximum memory limit for SQL Server (minimum 512MB recommended)',
          },
        ],
      },
      {
        label: 'Agent Configuration',
        description: 'Configure SQL Server Agent',
        fields: [
          {
            name: 'sqlserverSettings.enableAgent',
            label: 'Enable SQL Server Agent',
            type: 'checkbox',
            defaultValue: false,
            helpText:
              'Enable SQL Server Agent for job scheduling and automation',
          },
        ],
      },
    ];
  }

  // ==================== Docker Command Building ====================
  buildDockerArgs(config: any): DockerRunArgs {
    const envVars: Record<string, string> = {
      ACCEPT_EULA: config.acceptEula ? 'Y' : 'N',
      MSSQL_SA_PASSWORD: config.password,
    };

    // Product ID / Edition
    if (config.sqlserverSettings?.productId) {
      envVars.MSSQL_PID = config.sqlserverSettings.productId;
    }

    // Collation
    if (config.sqlserverSettings?.collation) {
      envVars.MSSQL_COLLATION = config.sqlserverSettings.collation;
    }

    // Memory limit
    if (config.sqlserverSettings?.memoryLimitMb) {
      envVars.MSSQL_MEMORY_LIMIT_MB =
        config.sqlserverSettings.memoryLimitMb.toString();
    }

    // Agent
    if (config.sqlserverSettings?.enableAgent) {
      envVars.MSSQL_AGENT_ENABLED = 'true';
    }

    return {
      image: `mcr.microsoft.com/mssql/server:${config.version}`,
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
    const username = container.username || 'sa';
    const database = container.databaseName || 'master';
    return `Server=localhost,${container.port};Database=${database};User Id=${username};Password=${container.password};TrustServerCertificate=True;`;
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.password || config.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    // SQL Server requires strong password
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (config.password && !strongPasswordRegex.test(config.password)) {
      errors.push(
        'Password must contain uppercase, lowercase, numbers, and special characters',
      );
    }

    if (!config.version) {
      errors.push('SQL Server version is required');
    }

    if (!config.acceptEula) {
      errors.push('You must accept the EULA to use SQL Server');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultUsername(): string {
    return 'sa';
  }

  requiresAuth(): boolean {
    return true;
  }
}

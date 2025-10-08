import { describe, expect, it } from 'vitest';
import { MongoDBDatabaseProvider } from '@/features/databases/providers/mongodb.provider';
import { MySQLDatabaseProvider } from '@/features/databases/providers/mysql.provider';
import { PostgresDatabaseProvider } from '@/features/databases/providers/postgres.provider';
import { RedisDatabaseProvider } from '@/features/databases/providers/redis.provider';
import {
  createMockContainer,
  createMockFormConfig,
  validateDockerRunArgs,
} from '../utils/test-utils';

describe('Database Providers', () => {
  // ==================== PostgreSQL Provider ====================
  describe('PostgresDatabaseProvider', () => {
    const provider = new PostgresDatabaseProvider();

    describe('Identification', () => {
      it('should have correct identification properties', () => {
        expect(provider.id).toBe('PostgreSQL');
        expect(provider.name).toBe('PostgreSQL');
        expect(provider.description).toBeTruthy();
        expect(provider.color).toBe('#336791');
      });

      it('should have correct docker configuration', () => {
        expect(provider.defaultPort).toBe(5432);
        expect(provider.containerPort).toBe(5432);
        expect(provider.dataPath).toBe('/var/lib/postgresql/data');
        expect(provider.versions).toContain('16');
      });
    });

    describe('Form Fields', () => {
      it('should return basic fields with correct structure', () => {
        const fields = provider.getBasicFields({ isEditMode: false });
        expect(fields).toHaveLength(3);
        expect(fields.find((f) => f.name === 'name')).toBeDefined();
        expect(fields.find((f) => f.name === 'port')).toBeDefined();
        expect(fields.find((f) => f.name === 'version')).toBeDefined();
      });

      it('should make version readonly in edit mode', () => {
        const editFields = provider.getBasicFields({ isEditMode: true });
        const versionField = editFields.find((f) => f.name === 'version');
        expect(versionField?.readonly).toBe(true);
      });

      it('should return authentication fields', () => {
        const fields = provider.getAuthenticationFields();
        expect(fields.length).toBeGreaterThan(0);
        expect(fields.find((f) => f.name === 'username')).toBeDefined();
        expect(fields.find((f) => f.name === 'password')).toBeDefined();
      });

      it('should return advanced fields grouped', () => {
        const groups = provider.getAdvancedFields();
        expect(Array.isArray(groups)).toBe(true);
      });
    });

    describe('Docker Args Building', () => {
      it('should build valid docker args with basic config', () => {
        const config = createMockFormConfig('postgres', {
          name: 'test-postgres',
          port: 5432,
          version: '16',
          username: 'postgres',
          password: 'testpass123',
          persistData: false,
        });

        const args = provider.buildDockerArgs(config);

        expect(validateDockerRunArgs(args)).toBe(true);
        expect(args.image).toBe('postgres:16');
        expect(args.envVars.POSTGRES_PASSWORD).toBe('testpass123');
        expect(args.ports).toHaveLength(1);
        expect(args.ports[0].host).toBe(5432);
        expect(args.ports[0].container).toBe(5432);
      });

      it('should include username env var when not default', () => {
        const config = createMockFormConfig('postgres', {
          username: 'customuser',
          password: 'testpass123',
          version: '16',
        });

        const args = provider.buildDockerArgs(config);
        expect(args.envVars.POSTGRES_USER).toBe('customuser');
      });

      it('should not include username env var when using default', () => {
        const config = createMockFormConfig('postgres', {
          username: 'postgres',
          password: 'testpass123',
          version: '16',
        });

        const args = provider.buildDockerArgs(config);
        expect(args.envVars.POSTGRES_USER).toBeUndefined();
      });

      it('should include database name when provided', () => {
        const config = createMockFormConfig('postgres', {
          password: 'testpass123',
          databaseName: 'mydb',
          version: '16',
        });

        const args = provider.buildDockerArgs(config);
        expect(args.envVars.POSTGRES_DB).toBe('mydb');
      });

      it('should create volume when persistData is true', () => {
        const config = createMockFormConfig('postgres', {
          name: 'test-postgres',
          password: 'testpass123',
          version: '16',
          persistData: true,
        });

        const args = provider.buildDockerArgs(config);
        expect(args.volumes).toHaveLength(1);
        expect(args.volumes[0].name).toBe('test-postgres-data');
        expect(args.volumes[0].path).toBe('/var/lib/postgresql/data');
      });

      it('should not create volume when persistData is false', () => {
        const config = createMockFormConfig('postgres', {
          password: 'testpass123',
          version: '16',
          persistData: false,
        });

        const args = provider.buildDockerArgs(config);
        expect(args.volumes).toHaveLength(0);
      });

      it('should include advanced postgres settings when provided', () => {
        const config = createMockFormConfig('postgres', {
          password: 'testpass123',
          version: '16',
          postgresSettings: {
            hostAuthMethod: 'scram-sha-256',
            initdbArgs: '--encoding=UTF8',
            sharedPreloadLibraries: 'pg_stat_statements',
          },
        });

        const args = provider.buildDockerArgs(config);
        expect(args.envVars.POSTGRES_HOST_AUTH_METHOD).toBe('scram-sha-256');
        expect(args.envVars.POSTGRES_INITDB_ARGS).toBe('--encoding=UTF8');
        expect(args.envVars.POSTGRES_SHARED_PRELOAD_LIBRARIES).toBe(
          'pg_stat_statements',
        );
      });
    });

    describe('Validation', () => {
      it('should validate valid config', () => {
        const config = createMockFormConfig('postgres', {
          password: 'testpass123',
          version: '16',
        });

        const result = provider.validateConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject config with short password', () => {
        const config = createMockFormConfig('postgres', {
          password: 'abc',
          version: '16',
        });

        const result = provider.validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Password must be at least 4 characters',
        );
      });

      it('should reject config without version', () => {
        const config = createMockFormConfig('postgres', {
          password: 'testpass123',
          version: '',
        });

        const result = provider.validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('version'))).toBe(true);
      });
    });

    describe('Connection String', () => {
      it('should generate correct connection string', () => {
        const container = createMockContainer({
          username: 'postgres',
          password: 'testpass',
          port: 5432,
          databaseName: 'testdb',
        });

        const connStr = provider.getConnectionString(container);
        expect(connStr).toBe(
          'postgresql://postgres:testpass@localhost:5432/testdb',
        );
      });

      it('should use default database when not specified', () => {
        const container = createMockContainer({
          username: 'postgres',
          password: 'testpass',
          port: 5432,
          databaseName: undefined,
        });

        const connStr = provider.getConnectionString(container);
        expect(connStr).toContain('/postgres');
      });
    });

    describe('Utilities', () => {
      it('should return default username', () => {
        expect(provider.getDefaultUsername()).toBe('postgres');
      });

      it('should require authentication', () => {
        expect(provider.requiresAuth()).toBe(true);
      });
    });
  });

  // ==================== MySQL Provider ====================
  describe('MySQLDatabaseProvider', () => {
    const provider = new MySQLDatabaseProvider();

    it('should have correct identification', () => {
      expect(provider.id).toBe('MySQL');
      expect(provider.defaultPort).toBe(3306);
      expect(provider.containerPort).toBe(3306);
      expect(provider.dataPath).toBe('/var/lib/mysql');
    });

    it('should build valid docker args', () => {
      const config = createMockFormConfig('mysql', {
        name: 'test-mysql',
        port: 3306,
        version: '8.0',
        username: 'root',
        password: 'rootpass123',
        persistData: false,
      });

      const args = provider.buildDockerArgs(config);
      expect(validateDockerRunArgs(args)).toBe(true);
      expect(args.image).toContain('mysql');
      expect(args.envVars.MYSQL_ROOT_PASSWORD).toBe('rootpass123');
    });

    it('should validate config correctly', () => {
      const validConfig = createMockFormConfig('mysql', {
        password: 'testpass123',
        version: '8.0',
      });

      const result = provider.validateConfig(validConfig);
      expect(result.valid).toBe(true);
    });

    it('should require authentication', () => {
      expect(provider.requiresAuth()).toBe(true);
    });
  });

  // ==================== Redis Provider ====================
  describe('RedisDatabaseProvider', () => {
    const provider = new RedisDatabaseProvider();

    it('should have correct identification', () => {
      expect(provider.id).toBe('Redis');
      expect(provider.defaultPort).toBe(6379);
      expect(provider.containerPort).toBe(6379);
      expect(provider.dataPath).toBe('/data');
    });

    it('should build valid docker args without auth', () => {
      const config = createMockFormConfig('redis', {
        name: 'test-redis',
        port: 6379,
        version: '7',
        enableAuth: false,
        persistData: false,
      });

      const args = provider.buildDockerArgs(config);
      expect(validateDockerRunArgs(args)).toBe(true);
      expect(args.image).toContain('redis');
    });

    it('should include password in command args when auth enabled', () => {
      const config = createMockFormConfig('redis', {
        port: 6379,
        version: '7',
        enableAuth: true,
        password: 'redispass123',
        persistData: false,
      });

      const args = provider.buildDockerArgs(config);
      expect(args.command).toContain('--requirepass');
      expect(args.command).toContain('redispass123');
    });

    it('should not require authentication by default', () => {
      expect(provider.requiresAuth()).toBe(false);
    });
  });

  // ==================== MongoDB Provider ====================
  describe('MongoDBDatabaseProvider', () => {
    const provider = new MongoDBDatabaseProvider();

    it('should have correct identification', () => {
      expect(provider.id).toBe('MongoDB');
      expect(provider.defaultPort).toBe(27017);
      expect(provider.containerPort).toBe(27017);
      expect(provider.dataPath).toBe('/data/db');
    });

    it('should build valid docker args with auth', () => {
      const config = createMockFormConfig('mongodb', {
        name: 'test-mongo',
        port: 27017,
        version: '7',
        username: 'admin',
        password: 'mongopass123',
        enableAuth: true,
        persistData: false,
      });

      const args = provider.buildDockerArgs(config);
      expect(validateDockerRunArgs(args)).toBe(true);
      expect(args.image).toContain('mongo');
      expect(args.envVars.MONGO_INITDB_ROOT_USERNAME).toBe('admin');
      expect(args.envVars.MONGO_INITDB_ROOT_PASSWORD).toBe('mongopass123');
    });

    it('should always include auth env vars', () => {
      // MongoDB provider always sets username (defaults to 'admin') and password
      const config = createMockFormConfig('mongodb', {
        port: 27017,
        version: '7.0',
        username: undefined, // Not provided
        password: 'testpass123',
        enableAuth: false,
        persistData: false,
      });

      const args = provider.buildDockerArgs(config);
      expect(validateDockerRunArgs(args)).toBe(true);
      // MongoDB defaults username to 'admin' if not provided
      expect(args.envVars.MONGO_INITDB_ROOT_USERNAME).toBe('admin');
      expect(args.envVars.MONGO_INITDB_ROOT_PASSWORD).toBe('testpass123');
    });

    it('should require authentication', () => {
      // MongoDB provider requires authentication
      expect(provider.requiresAuth()).toBe(true);
    });
  });
});

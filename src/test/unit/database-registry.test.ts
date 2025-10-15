import { describe, expect, it } from 'vitest';
import {
  createDatabaseRegistry,
  databaseRegistry,
} from '@/features/databases/registry/database-registry';

describe('DatabaseRegistry', () => {
  describe('Factory Pattern', () => {
    it('should create a registry with providers', () => {
      const customRegistry = createDatabaseRegistry();

      expect(customRegistry).toBeDefined();
      expect(customRegistry.count()).toBeGreaterThan(0);
    });

    it('should create independent registry instances', () => {
      const registry1 = createDatabaseRegistry();
      const registry2 = createDatabaseRegistry();

      // Both should have the same providers but be different instances
      expect(registry1.count()).toBe(registry2.count());
      expect(registry1).not.toBe(registry2);
    });
  });

  describe('Retrieval', () => {
    it('should retrieve a registered provider by ID', () => {
      const retrieved = databaseRegistry.get('PostgreSQL');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('PostgreSQL');
    });

    it('should return undefined for non-existent provider', () => {
      const retrieved = databaseRegistry.get('NonExistentDB');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve all registered providers', () => {
      const allProviders = databaseRegistry.getAll();
      expect(Array.isArray(allProviders)).toBe(true);
      expect(allProviders.length).toBeGreaterThan(0);
    });

    it('should retrieve all provider IDs', () => {
      const allIds = databaseRegistry.getAllIds();
      expect(Array.isArray(allIds)).toBe(true);
      expect(allIds.length).toBeGreaterThan(0);
    });
  });

  describe('Existence Check', () => {
    it('should correctly check if provider exists', () => {
      expect(databaseRegistry.has('PostgreSQL')).toBe(true);
      expect(databaseRegistry.has('NonExistentDB')).toBe(false);
    });
  });

  describe('Count', () => {
    it('should return correct count of registered providers', () => {
      const count = databaseRegistry.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Real Providers', () => {
    it('should have PostgreSQL provider registered', () => {
      const postgres = databaseRegistry.get('PostgreSQL');
      expect(postgres).toBeDefined();
      expect(postgres?.name).toBe('PostgreSQL');
      expect(postgres?.defaultPort).toBe(5432);
    });

    it('should have MySQL provider registered', () => {
      const mysql = databaseRegistry.get('MySQL');
      expect(mysql).toBeDefined();
      expect(mysql?.name).toBe('MySQL');
      expect(mysql?.defaultPort).toBe(3306);
    });

    it('should have Redis provider registered', () => {
      const redis = databaseRegistry.get('Redis');
      expect(redis).toBeDefined();
      expect(redis?.name).toBe('Redis');
      expect(redis?.defaultPort).toBe(6379);
    });

    it('should have MongoDB provider registered', () => {
      const mongodb = databaseRegistry.get('MongoDB');
      expect(mongodb).toBeDefined();
      expect(mongodb?.name).toBe('MongoDB');
      expect(mongodb?.defaultPort).toBe(27017);
    });

    it('should have MariaDB provider registered', () => {
      const mariadb = databaseRegistry.get('MariaDB');
      expect(mariadb).toBeDefined();
      expect(mariadb?.name).toBe('MariaDB');
      expect(mariadb?.defaultPort).toBe(3306);
    });

    it('should have SQL Server provider registered', () => {
      const sqlserver = databaseRegistry.get('SQLServer');
      expect(sqlserver).toBeDefined();
      expect(sqlserver?.name).toBe('SQL Server');
      expect(sqlserver?.defaultPort).toBe(1433);
    });

    it('should have InfluxDB provider registered', () => {
      const influxdb = databaseRegistry.get('InfluxDB');
      expect(influxdb).toBeDefined();
      expect(influxdb?.name).toBe('InfluxDB');
      expect(influxdb?.defaultPort).toBe(8086);
    });

    it('should have at least 7 real providers registered', () => {
      // Should have at least the 7 main database providers
      // (May have more if mock providers were registered in other tests)
      expect(databaseRegistry.count()).toBeGreaterThanOrEqual(7);
    });

    it('should have all expected provider IDs', () => {
      const ids = databaseRegistry.getAllIds();
      expect(ids).toContain('PostgreSQL');
      expect(ids).toContain('MySQL');
      expect(ids).toContain('Redis');
      expect(ids).toContain('MongoDB');
      expect(ids).toContain('MariaDB');
      expect(ids).toContain('SQLServer');
      expect(ids).toContain('InfluxDB');
    });
  });
});

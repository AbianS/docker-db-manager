import { beforeEach, describe, expect, it } from 'vitest';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import { MockDatabaseProvider } from '../utils/mock-providers';

// Import to trigger provider registration
import '@/features/databases/providers';

describe('DatabaseRegistry', () => {
  // Note: Registry is a singleton, so providers persist across tests
  // This is intentional as the registry is meant to be initialized once
  beforeEach(() => {
    // Nothing to clear - registry is shared across tests
  });

  describe('Registration', () => {
    it('should register a new provider', () => {
      const provider = new MockDatabaseProvider();
      const initialCount = databaseRegistry.count();

      databaseRegistry.register(provider);

      expect(databaseRegistry.has(provider.id)).toBe(true);
      expect(databaseRegistry.count()).toBeGreaterThanOrEqual(initialCount);
    });

    it('should allow overwriting existing providers', () => {
      const provider1 = new MockDatabaseProvider();
      const provider2 = new MockDatabaseProvider();

      databaseRegistry.register(provider1);
      const countAfterFirst = databaseRegistry.count();
      databaseRegistry.register(provider2); // Should overwrite

      // Count shouldn't change when overwriting (same ID)
      expect(databaseRegistry.count()).toBe(countAfterFirst);
      expect(databaseRegistry.has(provider1.id)).toBe(true);
    });
  });

  describe('Retrieval', () => {
    it('should retrieve a registered provider by ID', () => {
      const provider = new MockDatabaseProvider();
      databaseRegistry.register(provider);

      const retrieved = databaseRegistry.get(provider.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(provider.id);
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
      const provider = new MockDatabaseProvider();
      databaseRegistry.register(provider);

      expect(databaseRegistry.has(provider.id)).toBe(true);
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

    it('should have at least 4 real providers registered', () => {
      // Should have at least the 4 main database providers
      // (May have more if mock providers were registered in other tests)
      expect(databaseRegistry.count()).toBeGreaterThanOrEqual(4);
    });

    it('should have all expected provider IDs', () => {
      const ids = databaseRegistry.getAllIds();
      expect(ids).toContain('PostgreSQL');
      expect(ids).toContain('MySQL');
      expect(ids).toContain('Redis');
      expect(ids).toContain('MongoDB');
    });
  });
});

import type { DatabaseProvider } from './database-provider.interface';

/**
 * Database Registry
 * Central registry for all database providers
 * Automatically discovers and registers all available database types
 */
class DatabaseRegistry {
  private providers = new Map<string, DatabaseProvider>();

  /**
   * Register a new database provider
   */
  register(provider: DatabaseProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(
        `Provider with id "${provider.id}" is already registered. Overwriting.`,
      );
    }
    this.providers.set(provider.id, provider);
    console.log(`✅ Registered database provider: ${provider.name}`);
  }

  /**
   * Get a specific provider by ID
   */
  get(id: string): DatabaseProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  getAll(): DatabaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all provider IDs
   */
  getAllIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider exists
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Get count of registered providers
   */
  count(): number {
    return this.providers.size;
  }
}

// Singleton instance
export const databaseRegistry = new DatabaseRegistry();

/**
 * Hook to get a specific database provider
 */
export function useDatabaseProvider(id?: string): DatabaseProvider | null {
  if (!id) return null;
  return databaseRegistry.get(id) || null;
}

/**
 * Hook to get all database providers
 */
export function useAllDatabaseProviders(): DatabaseProvider[] {
  return databaseRegistry.getAll();
}

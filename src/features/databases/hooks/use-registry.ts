import { DatabaseProvider } from '../registry/database-provider.interface';
import { databaseRegistry } from '../registry/database-registry';

/**
 * Hook to get a specific database provider by ID
 * @param id - The database provider ID (e.g., 'PostgreSQL', 'MySQL')
 * @returns The database provider or null if not found
 */
export function useDatabaseProvider(id?: string): DatabaseProvider | null {
  if (!id) return null;
  return databaseRegistry.get(id) || null;
}

/**
 * Hook to get all registered database providers
 * @returns Array of all database providers
 */
export function useAllDatabaseProviders(): DatabaseProvider[] {
  return databaseRegistry.getAll();
}

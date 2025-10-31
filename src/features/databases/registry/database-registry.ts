import { ElasticsearchDatabaseProvider } from '../providers/elasticsearch.provider';
import { MariaDBDatabaseProvider } from '../providers/mariadb.provider';
import { MongoDBDatabaseProvider } from '../providers/mongodb.provider';
import { MySQLDatabaseProvider } from '../providers/mysql.provider';
import { PostgresDatabaseProvider } from '../providers/postgres.provider';
import { RedisDatabaseProvider } from '../providers/redis.provider';
import { SQLServerDatabaseProvider } from '../providers/sqlserver.provider';
import type { DatabaseProvider } from './database-provider.interface';

class DatabaseRegistry {
  private providers = new Map<string, DatabaseProvider>();

  constructor(providers: DatabaseProvider[]) {
    providers.forEach((provider) => {
      this.providers.set(provider.id, provider);
    });
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

/**
 * Factory function to create a DatabaseRegistry instance
 * Add new providers here when extending the application
 */
export function createDatabaseRegistry(): DatabaseRegistry {
  return new DatabaseRegistry([
    new PostgresDatabaseProvider(),
    new MySQLDatabaseProvider(),
    new MariaDBDatabaseProvider(),
    new RedisDatabaseProvider(),
    new MongoDBDatabaseProvider(),
    new SQLServerDatabaseProvider(),
    new ElasticsearchDatabaseProvider(),
  ]);
}

export const databaseRegistry = createDatabaseRegistry();

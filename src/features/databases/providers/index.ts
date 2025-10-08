/**
 * Database Providers Index
 * Auto-registers all database providers
 */

import { databaseRegistry } from '../registry/database-registry';
import { MongoDBDatabaseProvider } from './mongodb.provider';
import { MySQLDatabaseProvider } from './mysql.provider';
import { PostgresDatabaseProvider } from './postgres.provider';
import { RedisDatabaseProvider } from './redis.provider';

// Register all providers
databaseRegistry.register(new PostgresDatabaseProvider());
databaseRegistry.register(new MySQLDatabaseProvider());
databaseRegistry.register(new RedisDatabaseProvider());
databaseRegistry.register(new MongoDBDatabaseProvider());

console.log(
  `🗄️  Database Registry initialized with ${databaseRegistry.count()} providers`,
);

export * from './mongodb.provider';
export * from './mysql.provider';
// Re-export for convenience
export * from './postgres.provider';
export * from './redis.provider';

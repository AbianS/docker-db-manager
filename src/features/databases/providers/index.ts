/**
 * Database Providers Index
 * Auto-registers all database providers
 */

import { databaseRegistry } from '../registry/database-registry';
import { PostgresDatabaseProvider } from './postgres.provider';

// Import other providers as we create them
// import { MySQLDatabaseProvider } from './mysql.provider';
// import { RedisDatabaseProvider } from './redis.provider';
// import { MongoDBDatabaseProvider } from './mongodb.provider';

// Register all providers
databaseRegistry.register(new PostgresDatabaseProvider());
// databaseRegistry.register(new MySQLDatabaseProvider());
// databaseRegistry.register(new RedisDatabaseProvider());
// databaseRegistry.register(new MongoDBDatabaseProvider());

console.log(
  `🗄️  Database Registry initialized with ${databaseRegistry.count()} providers`,
);

// Re-export for convenience
export * from './postgres.provider';

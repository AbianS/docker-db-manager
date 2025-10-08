import { z } from 'zod';

/**
 * Simplified form schema - Provider-agnostic
 * Specific validations are now handled by each database provider
 */
export const createDatabaseFormSchema = z.object({
  databaseSelection: z.object({
    // Database type - dynamic based on registered providers
    dbType: z.string().min(1, 'Please select a database type'),
  }),
  containerConfiguration: z
    .object({
      // Basic container configuration (common to all databases)
      name: z
        .string()
        .min(1, 'Container name is required')
        .max(50, 'Name cannot exceed 50 characters')
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          'Only letters, numbers, hyphens and underscores are allowed',
        ),
      port: z
        .number()
        .min(1024, 'Port must be greater than 1024')
        .max(65535, 'Port must be less than 65535'),
      version: z.string().min(1, 'Version is required'),

      // Optional common fields
      username: z.string().optional(),
      password: z.string().optional(),
      databaseName: z.string().optional(),

      // Storage options
      persistData: z.boolean().default(true),
      enableAuth: z.boolean().default(true),
      maxConnections: z.number().optional(),
    })
    // Allow any additional fields for database-specific settings
    // Each provider will validate its own fields
    .passthrough(),
});

export type CreateDatabaseFormValidation = z.infer<
  typeof createDatabaseFormSchema
>;

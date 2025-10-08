import type { ReactNode } from 'react';
import type { Container } from '@/shared/types/container';
import type { DockerRunArgs, ValidationResult } from '../types/docker.types';
import type { FieldGroup, FormField } from '../types/form.types';

/**
 * Database Provider Interface
 * Each database type implements this interface to provide all necessary configuration
 */
export interface DatabaseProvider {
  // ==================== Identification ====================
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: ReactNode;
  readonly color: string;

  // ==================== Docker Configuration ====================
  readonly defaultPort: number;
  readonly containerPort: number;
  readonly dataPath: string;
  readonly versions: string[];

  // ==================== Form Fields (Dynamic) ====================
  /**
   * Get basic fields specific to this database (version, etc.)
   */
  getBasicFields(): FormField[];

  /**
   * Get authentication fields (username, password, database name)
   */
  getAuthenticationFields(): FormField[];

  /**
   * Get advanced configuration fields grouped by category
   */
  getAdvancedFields(): FieldGroup[];

  // ==================== Docker Command Building ====================
  /**
   * Build Docker run arguments from form configuration
   */
  buildDockerArgs(config: any): DockerRunArgs;

  // ==================== Utilities ====================
  /**
   * Generate connection string for this database type
   */
  getConnectionString(container: Container): string;

  /**
   * Validate configuration before creating container
   */
  validateConfig(config: any): ValidationResult;

  /**
   * Get default username for this database (if any)
   */
  getDefaultUsername?(): string;

  /**
   * Check if this database requires authentication
   */
  requiresAuth(): boolean;
}

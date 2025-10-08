/**
 * Docker configuration types
 * These types represent the structure sent to the backend
 */

export interface PortMapping {
  host: number;
  container: number;
}

export interface VolumeMount {
  name: string;
  path: string;
}

export interface DockerRunArgs {
  image: string;
  envVars: Record<string, string>;
  ports: PortMapping[];
  volumes: VolumeMount[];
  command: string[];
}

export interface DockerRunRequest {
  name: string;
  dockerArgs: DockerRunArgs;
  metadata: ContainerMetadata;
}

export interface ContainerMetadata {
  id: string;
  dbType: string;
  version: string;
  port: number;
  username?: string;
  password: string;
  databaseName?: string;
  persistData: boolean;
  enableAuth: boolean;
  maxConnections?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

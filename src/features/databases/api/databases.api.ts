import { invoke } from '@/core/tauri/invoke';
import type { Container } from '@/shared/types/container';
import { containerFromJSON } from '@/shared/utils/container';
import type { DockerRunRequest } from '../types/docker.types';

/**
 * Unified Databases API
 * Contains all database/container operations:
 * - CRUD operations using provider-based system
 * - Container lifecycle (start, stop, remove)
 * - Query operations (getAll, getById, sync)
 */
export const databasesApi = {
  /**
   * Create a new database container from generic Docker run request
   * Uses provider-generated Docker args
   */
  async create(request: DockerRunRequest): Promise<Container> {
    const result = await invoke<unknown>('create_container_from_docker_args', {
      request,
    });
    return containerFromJSON(result);
  },

  /**
   * Update an existing database container from generic Docker run request
   * Uses provider-generated Docker args
   */
  async update(
    containerId: string,
    request: DockerRunRequest,
  ): Promise<Container> {
    const result = await invoke<unknown>('update_container_from_docker_args', {
      containerId,
      request,
    });
    return containerFromJSON(result);
  },

  /**
   * Get all database containers
   */
  async getAll(): Promise<Container[]> {
    const result = await invoke<unknown[]>('get_all_databases');
    return result.map(containerFromJSON);
  },

  /**
   * Get a database container by ID
   */
  async getById(id: string): Promise<Container> {
    const all = await this.getAll();
    const container = all.find((c) => c.id === id);
    if (!container) {
      throw new Error(`Database container with id ${id} not found`);
    }
    return container;
  },

  /**
   * Start a database container
   */
  async start(id: string): Promise<void> {
    await invoke('start_container', { containerId: id });
  },

  /**
   * Stop a database container
   */
  async stop(id: string): Promise<void> {
    await invoke('stop_container', { containerId: id });
  },

  /**
   * Remove a database container
   */
  async remove(id: string): Promise<void> {
    await invoke('remove_container', { containerId: id });
  },

  /**
   * Synchronize database containers with Docker
   */
  async sync(): Promise<Container[]> {
    const result = await invoke<unknown[]>('sync_containers_with_docker');
    return result.map(containerFromJSON);
  },
};

import { invoke } from '../../../core/tauri/invoke';
import type { Container } from '../../../shared/types/container';
import { containerFromJSON } from '../../../shared/utils/container';

/**
 * Legacy Containers API Layer
 * Keeps only basic operations (get, start, stop, remove)
 * Create/Update now use genericContainersApi with provider-based system
 */
export const containersApi = {
  /**
   * Get all containers
   */
  async getAll(): Promise<Container[]> {
    const result = await invoke<unknown[]>('get_all_databases');
    return result.map(containerFromJSON);
  },

  /**
   * Get a container by ID
   */
  async getById(id: string): Promise<Container> {
    // For now, get all and filter (no individual get_database command)
    const all = await this.getAll();
    const container = all.find((c) => c.id === id);
    if (!container) {
      throw new Error(`Container with id ${id} not found`);
    }
    return container;
  },

  // REMOVED: create() - Now using genericContainersApi.createFromDockerArgs()
  // REMOVED: update() - Now using genericContainersApi.updateFromDockerArgs()

  /**
   * Start a container
   */
  async start(id: string): Promise<void> {
    await invoke('start_container', { containerId: id });
  },

  /**
   * Stop a container
   */
  async stop(id: string): Promise<void> {
    await invoke('stop_container', { containerId: id });
  },

  /**
   * Remove a container
   */
  async remove(id: string): Promise<void> {
    await invoke('remove_container', { containerId: id });
  },

  /**
   * Synchronize containers with Docker
   */
  async sync(): Promise<Container[]> {
    const result = await invoke<unknown[]>('sync_containers_with_docker');
    return result.map(containerFromJSON);
  },
};

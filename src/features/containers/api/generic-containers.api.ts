import type { DockerRunRequest } from '@/features/databases/types/docker.types';
import { invoke } from '../../../core/tauri/invoke';
import type { Container } from '../../../shared/types/container';
import { containerFromJSON } from '../../../shared/utils/container';

/**
 * NEW API - Generic container operations using Docker args from providers
 * Database-agnostic API that works with any provider
 */
export const genericContainersApi = {
  /**
   * Create a new container from generic Docker run request
   * This uses the provider-generated Docker args
   */
  async createFromDockerArgs(request: DockerRunRequest): Promise<Container> {
    const result = await invoke<unknown>('create_container_from_docker_args', {
      request,
    });
    return containerFromJSON(result);
  },

  /**
   * Update an existing container from generic Docker run request
   * This uses the provider-generated Docker args
   */
  async updateFromDockerArgs(
    containerId: string,
    request: DockerRunRequest,
  ): Promise<Container> {
    const result = await invoke<unknown>('update_container_from_docker_args', {
      containerId,
      request,
    });
    return containerFromJSON(result);
  },
};

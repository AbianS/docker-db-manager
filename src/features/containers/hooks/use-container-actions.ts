import { useCallback } from 'react';
import { toast } from 'sonner';
import { handleContainerError } from '../../../core/errors/error-handler';
import type { Container } from '../../../shared/types/container';
import { containersApi } from '../api/containers.api';

/**
 * Hook for container actions (start, stop, remove, getById)
 * Responsibility: Individual operations without global state management
 * Note: Create/Update are now handled by the new generic API with providers
 */
export function useContainerActions() {
  // REMOVED: update() - Now using genericContainersApi.updateFromDockerArgs() with providers

  /**
   * Start a container
   */
  const start = useCallback(async (containerId: string): Promise<void> => {
    try {
      await containersApi.start(containerId);
      toast.success('Database started');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Stop a container
   */
  const stop = useCallback(async (containerId: string): Promise<void> => {
    try {
      await containersApi.stop(containerId);
      toast.success('Database stopped');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Remove a container
   */
  const remove = useCallback(async (containerId: string): Promise<void> => {
    try {
      await containersApi.remove(containerId);
      toast.success('Database removed');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Get a container by ID
   */
  const getById = useCallback(
    async (containerId: string): Promise<Container> => {
      try {
        return await containersApi.getById(containerId);
      } catch (error) {
        handleContainerError(error);
      }
    },
    [],
  );

  return {
    start,
    stop,
    remove,
    getById,
  };
}

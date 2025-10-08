import { useCallback } from 'react';
import { toast } from 'sonner';
import { handleContainerError } from '@/core/errors/error-handler';
import type { Container } from '@/shared/types/container';
import { databasesApi } from '../api/databases.api';

/**
 * Hook for database actions (start, stop, remove, getById)
 * Responsibility: Individual operations without global state management
 */
export function useDatabaseActions() {
  /**
   * Start a database container
   */
  const start = useCallback(async (containerId: string): Promise<void> => {
    try {
      await databasesApi.start(containerId);
      toast.success('Database started');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Stop a database container
   */
  const stop = useCallback(async (containerId: string): Promise<void> => {
    try {
      await databasesApi.stop(containerId);
      toast.success('Database stopped');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Remove a database container
   */
  const remove = useCallback(async (containerId: string): Promise<void> => {
    try {
      await databasesApi.remove(containerId);
      toast.success('Database removed');
    } catch (error) {
      handleContainerError(error);
    }
  }, []);

  /**
   * Get a database container by ID
   */
  const getById = useCallback(
    async (containerId: string): Promise<Container> => {
      try {
        return await databasesApi.getById(containerId);
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

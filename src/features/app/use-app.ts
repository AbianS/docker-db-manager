import { useCallback, useEffect } from 'react';
import { useDatabaseActions } from '../databases/hooks/use-database-actions';
import { useDatabaseList } from '../databases/hooks/use-database-list';
import { useDockerStatus } from '../docker/hooks/use-docker-status';

/**
 * Main orchestration hook
 * Combines containers + docker status and coordinates their interactions
 *
 * This hook replaces the old useApp, but with clearer responsibilities
 */
export function useApp() {
  // Database container state and actions
  const containerList = useDatabaseList();
  const containerActions = useDatabaseActions();

  // Docker status
  const docker = useDockerStatus();

  /**
   * Initial container loading
   */
  useEffect(() => {
    if (docker.isDockerAvailable) {
      containerList.load();
    }
  }, [docker.isDockerAvailable]);

  /**
   * Toggle container status (start/stop)
   */
  const toggleContainerStatus = useCallback(
    async (containerId: string) => {
      const container = containerList.containers.find(
        (c) => c.id === containerId,
      );
      if (!container) return;

      if (container.status === 'running') {
        await containerActions.stop(containerId);
      } else {
        await containerActions.start(containerId);
      }

      // Synchronize after status change
      await containerList.sync();
    },
    [containerList, containerActions],
  );

  /**
   * Remove container and update list
   */
  const removeContainer = useCallback(
    async (containerId: string) => {
      await containerActions.remove(containerId);
      containerList.removeLocal(containerId);
    },
    [containerActions, containerList],
  );

  return {
    // Database container state
    containers: containerList.containers,
    containersLoading: containerList.loading,

    // Database container actions
    removeContainer,
    startContainer: containerActions.start,
    stopContainer: containerActions.stop,
    toggleContainerStatus,
    loadContainers: containerList.load,
    syncContainers: containerList.sync,

    // Docker status
    dockerStatus: docker.dockerStatus,
    dockerRefreshing: docker.isRefreshing,
    refreshDockerStatus: docker.refreshStatus,
    isDockerAvailable: docker.isDockerAvailable,
    showDockerOverlay: docker.shouldShowOverlay,
  };
}

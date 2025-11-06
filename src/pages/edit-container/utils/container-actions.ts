import type { ContainerStatus } from '@/shared/types/container';

/**
 * Configuration for a container action in the toolbar
 * Defines the behavior and availability of actions based on container state
 */
export interface ActionConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresRunning?: boolean; // If true, only available when container is running
  requiresStopped?: boolean; // If true, only available when container is stopped
  onClick: () => void;
}

/**
 * Configuration for a tab in the container detail view
 * Defines which tabs are available based on container state
 */
export interface TabConfig {
  id: string;
  label: string;
  requiresRunning?: boolean; // If true, only available when container is running
  requiresStopped?: boolean; // If true, only available when container is stopped
}

/**
 * Determines if an action is available based on container status
 * 
 * @param action - Action configuration to check
 * @param containerStatus - Current status of the container
 * @returns true if action is available, false otherwise
 */
export function isActionAvailable(
  action: ActionConfig,
  containerStatus: ContainerStatus,
): boolean {
  const isRunning = containerStatus === 'running';

  // If action requires running container but it's not running
  if (action.requiresRunning && !isRunning) {
    return false;
  }

  // If action requires stopped container but it's running
  if (action.requiresStopped && isRunning) {
    return false;
  }

  // Action is available
  return true;
}

/**
 * Determines if a tab is available based on container status
 * 
 * @param tab - Tab configuration to check
 * @param containerStatus - Current status of the container
 * @returns true if tab is available, false otherwise
 */
export function isTabAvailable(
  tab: TabConfig,
  containerStatus: ContainerStatus,
): boolean {
  const isRunning = containerStatus === 'running';

  // If tab requires running container but it's not running
  if (tab.requiresRunning && !isRunning) {
    return false;
  }

  // If tab requires stopped container but it's running
  if (tab.requiresStopped && isRunning) {
    return false;
  }

  // Tab is available
  return true;
}

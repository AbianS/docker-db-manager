import type { ComponentType } from 'react';
import type { ContainerStatus } from '@/shared/types/container';

export interface ActionConfig {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requiresRunning?: boolean; // If true, only available when container is running
  requiresStopped?: boolean; // If true, only available when container is stopped
  onClick: () => void;
}

export interface TabConfig {
  id: string;
  label: string;
  requiresRunning?: boolean; // If true, only available when container is running
  requiresStopped?: boolean; // If true, only available when container is stopped
}

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

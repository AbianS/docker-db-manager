/**
 * Available tabs in the container detail view
 */
export enum ContainerTab {
  Dashboard = 'dashboard',
  Configuration = 'configuration',
  Logs = 'logs',
}

/**
 * Tab labels for display
 */
export const TAB_LABELS: Record<ContainerTab, string> = {
  [ContainerTab.Dashboard]: 'Dashboard',
  [ContainerTab.Configuration]: 'Configuration',
  [ContainerTab.Logs]: 'Logs',
};

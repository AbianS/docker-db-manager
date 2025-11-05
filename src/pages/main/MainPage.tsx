import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAppUpdater } from '../../features/app/hooks/use-app-updater';
import { DeleteConfirmationDialog } from '../../shared/components/DeleteConfirmationDialog';
import { DockerUnavailableOverlay } from '../../shared/components/DockerUnavailableOverlay';
import { DatabaseManager } from './components/DatabaseManager';
import { useContainerSearch } from './hooks/use-container-search';
import { useContainerStats } from './hooks/use-container-stats';
import { useMainPage } from './hooks/use-main-page';

export function MainPage() {
  const page = useMainPage();
  const search = useContainerSearch(page.containers);
  const stats = useContainerStats(page.containers);
  const updater = useAppUpdater();

  /**
   * Auto-check for updates on app start (silent mode)
   * Runs once on component mount
   */
  useEffect(() => {
    updater.checkForUpdates(true);
  }, []);

  return (
    <div className="h-screen w-full bg-background">
      <DatabaseManager
        containers={search.filteredContainers}
        stats={stats}
        searchQuery={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        hasActiveSearch={search.hasActiveSearch}
        loading={page.containersLoading}
        onStatusToggle={page.handleStatusToggle}
        onDelete={page.handleDelete}
        onCreateContainer={page.openCreateWindow}
        onEditContainer={page.openEditWindow}
        disabled={page.containersLoading || !page.isDockerAvailable}
        updateAvailable={updater.updateAvailable}
        checkingUpdate={updater.checking}
        downloadingUpdate={updater.downloading}
        onCheckForUpdates={() => updater.checkForUpdates(false)}
      />

      <DeleteConfirmationDialog
        open={page.deleteDialogOpen}
        container={page.containerToDelete}
        onConfirm={page.handleConfirmDelete}
        onCancel={page.handleCancelDelete}
        loading={page.containersLoading}
      />

      {page.showDockerOverlay && (
        <DockerUnavailableOverlay
          status={
            page.dockerStatus?.status === 'running'
              ? 'connecting'
              : page.dockerStatus?.status || 'error'
          }
          error={page.dockerStatus?.error}
          onRetry={page.refreshDockerStatus}
          isRetrying={page.dockerRefreshing}
        />
      )}

      <Toaster
        position="bottom-right"
        richColors
        theme={'dark'}
        visibleToasts={3}
      />
    </div>
  );
}

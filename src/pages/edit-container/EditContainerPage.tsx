import { getCurrentWindow } from '@tauri-apps/api/window';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { invoke } from '@/core/tauri/invoke';
import { DeleteConfirmationDialog } from '@/shared/components/DeleteConfirmationDialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import {
  ConfigurationTab,
  useUnsavedChangesWarning,
} from './components/ConfigurationTab';
import { ContainerDashboard } from './components/ContainerDashboard';
import { ContainerHeader } from './components/ContainerHeader';
import { LogsTab } from './components/LogsTab';
import { TerminalTab } from './components/TerminalTab';
import { useDatabaseEditWizard } from './hooks/use-database-edit-wizard';
import { ContainerTab, TAB_LABELS } from './types/tabs';
import { isTabAvailable, type TabConfig } from './utils/container-actions';

export function EditContainerPage() {
  // Extract container ID from query parameters
  const containerId = new URLSearchParams(window.location.search).get('id');
  const [activeTab, setActiveTab] = useState<ContainerTab>(
    ContainerTab.Dashboard,
  );

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load container data and form
  const { container, loading, saving, form, save, cancel, refetch } =
    useDatabaseEditWizard(containerId || '');

  // Unsaved changes warning
  const { checkUnsavedChanges, UnsavedChangesDialog } =
    useUnsavedChangesWarning();

  const {
    formState: { isDirty },
  } = form;

  /**
   * Start the container
   */
  const handleStartContainer = async () => {
    if (!container) return;

    try {
      await invoke('start_container', { containerId: container.id });
      toast.success('Container started successfully');
      refetch(); // Refresh container data
    } catch (error) {
      console.error('Error starting container:', error);
      toast.error('Failed to start container');
    }
  };

  /**
   * Stop the container
   */
  const handleStopContainer = async () => {
    if (!container) return;

    try {
      await invoke('stop_container', { containerId: container.id });
      toast.success('Container stopped successfully');

      // If current tab requires running container, switch to Dashboard
      const currentTab = tabs.find((tab) => tab.id === activeTab);
      if (currentTab?.requiresRunning) {
        setActiveTab(ContainerTab.Dashboard);
      }

      refetch(); // Refresh container data
    } catch (error) {
      console.error('Error stopping container:', error);
      toast.error('Failed to stop container');
    }
  };

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteContainer = () => {
    setDeleteDialogOpen(true);
  };

  /**
   * Confirm container deletion
   */
  const handleConfirmDelete = async () => {
    if (!container) return;

    setDeleting(true);
    try {
      await invoke('remove_container', { containerId: container.id });
      toast.success('Container deleted successfully');
      setDeleteDialogOpen(false);
      
      // Close window after deletion
      const currentWindow = getCurrentWindow();
      await currentWindow.close();
    } catch (error) {
      console.error('Error deleting container:', error);
      toast.error('Failed to delete container');
      setDeleting(false);
    }
  };

  /**
   * Cancel container deletion
   */
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  /**
   * Define available tabs with their configurations
   */
  const tabs: TabConfig[] = [
    {
      id: ContainerTab.Dashboard,
      label: TAB_LABELS[ContainerTab.Dashboard],
    },
    {
      id: ContainerTab.Configuration,
      label: TAB_LABELS[ContainerTab.Configuration],
    },
    {
      id: ContainerTab.Logs,
      label: TAB_LABELS[ContainerTab.Logs],
      requiresRunning: true, // Logs only available when container is running
    },
    {
      id: ContainerTab.Terminal,
      label: TAB_LABELS[ContainerTab.Terminal],
      requiresRunning: true, // Terminal only available when container is running
    },
  ];

  /**
   * Handle tab change with unsaved changes check
   */
  const handleTabChange = (value: string) => {
    const newTab = value as ContainerTab;

    // Check for unsaved changes before switching
    if (activeTab === ContainerTab.Configuration && isDirty) {
      checkUnsavedChanges(isDirty, () => {
        setActiveTab(newTab);
        cancel(); // Reset form to discard changes using last loaded container state
      });
    } else {
      setActiveTab(newTab);
    }
  };

  if (!containerId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">No database specified for editing</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!container) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Database not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Titlebar space - matches titlebar height */}
      <div className="h-6 bg-background" data-tauri-drag-region />

      {/* Header with toolbar */}
      <ContainerHeader
        container={container}
        onStart={handleStartContainer}
        onStop={handleStopContainer}
        onDelete={handleDeleteContainer}
      />

      {/* Tabs navigation and content */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full rounded-none border-b px-6 bg-card grid grid-cols-4">
          {tabs.map((tab) => {
            const isAvailable = isTabAvailable(tab, container.status);

            if (!isAvailable) {
              return (
                <Tooltip key={tab.id} delayDuration={500}>
                  <TooltipTrigger asChild>
                    <div style={{ cursor: 'not-allowed' }}>
                      <TabsTrigger
                        value={tab.id}
                        disabled={true}
                        className="relative opacity-50 w-full"
                        style={{ pointerEvents: 'none' }}
                      >
                        {tab.label}
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-center">
                      <p className="text-xs">
                        {tab.requiresRunning && 'Requires running container'}
                        {tab.requiresStopped && 'Requires stopped container'}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <TabsTrigger key={tab.id} value={tab.id} className="relative">
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent
          value={ContainerTab.Dashboard}
          className="flex-1 overflow-auto m-0 pt-0"
        >
          <ContainerDashboard container={container} />
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent
          value={ContainerTab.Configuration}
          className="flex-1 overflow-hidden m-0 pt-0"
        >
          <ConfigurationTab
            container={container}
            form={form}
            saving={saving}
            onSave={save}
            onCancel={cancel}
          />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent
          value={ContainerTab.Logs}
          className="flex-1 overflow-hidden m-0 pt-0"
        >
          <LogsTab container={container} />
        </TabsContent>

        {/* Terminal Tab */}
        <TabsContent
          value={ContainerTab.Terminal}
          className="flex-1 overflow-hidden m-0 pt-0"
        >
          <TerminalTab container={container} />
        </TabsContent>
      </Tabs>

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        container={container}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleting}
      />

      <Toaster
        position="bottom-right"
        richColors
        theme={'dark'}
        visibleToasts={3}
      />
    </div>
  );
}

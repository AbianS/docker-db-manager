import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { ConfigurationTab, useUnsavedChangesWarning } from './components/ConfigurationTab';
import { ContainerDashboard } from './components/ContainerDashboard';
import { ContainerHeader } from './components/ContainerHeader';
import { LogsTab } from './components/LogsTab';
import { useDatabaseEditWizard } from './hooks/use-database-edit-wizard';
import { ContainerTab, TAB_LABELS } from './types/tabs';
import { isTabAvailable, type TabConfig } from './utils/container-actions';

export function EditContainerPage() {
  // Extract container ID from query parameters
  const containerId = new URLSearchParams(window.location.search).get('id');
  const [activeTab, setActiveTab] = useState<ContainerTab>(
    ContainerTab.Dashboard,
  );

  // Load container data and form
  const { container, loading, saving, form, save, cancel } =
    useDatabaseEditWizard(containerId || '');

  // Unsaved changes warning
  const { checkUnsavedChanges, UnsavedChangesDialog } =
    useUnsavedChangesWarning();

  const {
    formState: { isDirty },
  } = form;

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
        form.reset(); // Reset form to discard changes
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
      <ContainerHeader container={container} />

      {/* Tabs navigation and content */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full rounded-none border-b px-6 bg-card grid grid-cols-3">
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
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative"
              >
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
          className="flex-1 overflow-auto m-0 pt-0"
        >
          <LogsTab />
        </TabsContent>
      </Tabs>

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog />

      <Toaster
        position="bottom-right"
        richColors
        theme={'dark'}
        visibleToasts={3}
      />
    </div>
  );
}

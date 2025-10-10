import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { databasesApi } from '@/features/databases/api/databases.api';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import type { DockerRunRequest } from '@/features/databases/types/docker.types';
import type { Container } from '@/shared/types/container';

/**
 * Form data structure for editing
 * Uses the same structure as creation but all fields are optional for updates
 */
export interface EditDatabaseFormData {
  containerConfiguration: Record<string, any>;
}

/**
 * Hook to manage database container editing with provider-based system
 * Uses the new generic update API with providers
 */
export function useDatabaseEditWizard(containerId: string) {
  const [container, setContainer] = useState<Container | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form setup - NO ZOD RESOLVER
  const form = useForm<EditDatabaseFormData>({
    defaultValues: {
      containerConfiguration: {},
    },
    mode: 'onChange',
  });

  const { setValue } = form;

  /**
   * Load container by ID and populate form
   */
  const loadContainer = useCallback(async () => {
    setLoading(true);
    try {
      const loadedContainer = await databasesApi.getById(containerId);
      setContainer(loadedContainer);

      // Get the provider for this database type
      const provider = databaseRegistry.get(loadedContainer.dbType);
      if (!provider) {
        throw new Error(`No provider found for ${loadedContainer.dbType}`);
      }

      // Populate form with current container data
      setValue('containerConfiguration.name', loadedContainer.name);
      setValue('containerConfiguration.port', loadedContainer.port);
      setValue('containerConfiguration.version', loadedContainer.version);
      setValue(
        'containerConfiguration.persistData',
        loadedContainer.persistData,
      );
      setValue('containerConfiguration.enableAuth', loadedContainer.enableAuth);
      setValue('containerConfiguration.username', loadedContainer.username);
      setValue('containerConfiguration.password', loadedContainer.password);
      setValue(
        'containerConfiguration.databaseName',
        loadedContainer.databaseName,
      );
      setValue(
        'containerConfiguration.maxConnections',
        loadedContainer.maxConnections,
      );

      console.log('✅ Loaded container for editing:', loadedContainer);
    } catch (error) {
      console.error('Error loading container:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [containerId, setValue]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadContainer();
  }, [loadContainer]);

  /**
   * Cancel and close window
   */
  const cancel = useCallback(async () => {
    try {
      const currentWindow = getCurrentWindow();
      await currentWindow.close();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  }, []);

  /**
   * Transform form data to Docker Run Request using provider
   */
  const transformFormToDockerRequest = useCallback(
    (data: EditDatabaseFormData, container: Container): DockerRunRequest => {
      const { containerConfiguration } = data;

      if (!container) {
        throw new Error('Container not loaded');
      }

      // Get the provider for this database type
      const provider = databaseRegistry.get(container.dbType);
      if (!provider) {
        throw new Error(
          `No provider found for database type: ${container.dbType}`,
        );
      }

      // Let the provider build the Docker arguments
      const dockerArgs = provider.buildDockerArgs(containerConfiguration);

      return {
        name: containerConfiguration.name,
        dockerArgs,
        metadata: {
          id: container.id, // Keep the same ID
          dbType: container.dbType,
          version: containerConfiguration.version,
          port: containerConfiguration.port!,
          username: containerConfiguration.username,
          password: containerConfiguration.password || container.password || '',
          databaseName: containerConfiguration.databaseName,
          persistData: containerConfiguration.persistData ?? true,
          enableAuth: containerConfiguration.enableAuth ?? true,
          maxConnections: containerConfiguration.maxConnections,
        },
      };
    },
    [],
  );

  /**
   * Save changes and close window
   */
  const save = useCallback(
    async (data: EditDatabaseFormData) => {
      if (!container) {
        console.error('❌ No container loaded');
        return;
      }

      setSaving(true);
      try {
        const { containerConfiguration } = data;

        // Get the provider for validation
        const provider = databaseRegistry.get(container.dbType);
        if (!provider) {
          throw new Error(
            `No provider found for database type: ${container.dbType}`,
          );
        }

        // Validate with provider before updating
        const validation = provider.validateConfig(containerConfiguration);
        if (!validation.valid) {
          const errorMessage = validation.errors.join('\n');
          console.error('❌ Validation errors:', validation.errors);
          alert(`Validation failed:\n${errorMessage}`);
          throw new Error(`Validation failed: ${errorMessage}`);
        }

        const dockerRequest = transformFormToDockerRequest(data, container);

        // Use the new unified databases API
        console.log('🔄 Updating container with Docker args:', dockerRequest);
        const updatedContainer = await databasesApi.update(
          container.id,
          dockerRequest,
        );

        // Emit event to notify main window
        try {
          await emit('container-updated', { container: updatedContainer });
        } catch (eventError) {
          console.warn('Error emitting event:', eventError);
        }

        // Close window
        const currentWindow = getCurrentWindow();
        await currentWindow.close();
      } catch (error) {
        console.error('Error updating container:', error);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [container, transformFormToDockerRequest],
  );

  return {
    container,
    loading,
    saving,
    form,
    save,
    cancel,
  };
}

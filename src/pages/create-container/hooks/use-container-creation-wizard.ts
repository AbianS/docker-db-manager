import { zodResolver } from '@hookform/resolvers/zod';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import type { DockerRunRequest } from '@/features/databases/types/docker.types';
import { useContainerActions } from '../../../features/containers/hooks/use-container-actions';
import {
  type CreateDatabaseFormValidation,
  createDatabaseFormSchema,
} from '../schemas/database-form.schema';
import { FORM_STEPS } from '../types/form-steps';

/**
 * Hook to manage the container creation wizard
 * Responsibility: Wizard logic (steps, validation, submit)
 */
export function useContainerCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { create } = useContainerActions();

  // Form setup
  const form = useForm<CreateDatabaseFormValidation>({
    resolver: zodResolver(createDatabaseFormSchema),
    defaultValues: {
      databaseSelection: {
        dbType: undefined,
      },
      containerConfiguration: {
        name: '',
        port: 5432,
        version: '',
        username: '',
        password: '',
        databaseName: '',
        persistData: true,
        enableAuth: true,
        maxConnections: undefined,
        postgresSettings: {},
        mysqlSettings: {},
        redisSettings: {},
        mongoSettings: {},
      },
    },
    mode: 'onChange',
  });

  const { handleSubmit, trigger, watch } = form;

  /**
   * Advance to next step if validation is correct
   */
  const nextStep = useCallback(async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger('databaseSelection');
    } else if (currentStep === 2) {
      isValid = await trigger('containerConfiguration');
    }

    if (isValid) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }
      if (currentStep < FORM_STEPS.length) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, completedSteps, trigger]);

  /**
   * Go back to previous step
   */
  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

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
   * Validate if current step is complete
   */
  const isCurrentStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        return Boolean(watch('databaseSelection.dbType'));
      case 2:
        const config = watch('containerConfiguration');
        return !!(config.name && config.port && config.version);
      case 3:
        return true;
      default:
        return true;
    }
  }, [currentStep, watch]);

  /**
   * Transform form data to Docker Run Request using provider
   */
  const transformFormToDockerRequest = useCallback(
    (data: CreateDatabaseFormValidation): DockerRunRequest => {
      const { databaseSelection, containerConfiguration } = data;

      // Get the provider for this database type
      const provider = databaseRegistry.get(databaseSelection.dbType);
      if (!provider) {
        throw new Error(
          `No provider found for database type: ${databaseSelection.dbType}`,
        );
      }

      // Let the provider build the Docker arguments
      const dockerArgs = provider.buildDockerArgs(containerConfiguration);

      // Generate unique ID for this container
      const containerId = crypto.randomUUID();

      return {
        name: containerConfiguration.name,
        dockerArgs,
        metadata: {
          id: containerId,
          dbType: databaseSelection.dbType,
          version: containerConfiguration.version,
          port: containerConfiguration.port!,
          username: containerConfiguration.username,
          password: containerConfiguration.password || '',
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
   * Final submit - create container and close window
   */
  const submit = useCallback(
    async (data: CreateDatabaseFormValidation) => {
      try {
        const dockerRequest = transformFormToDockerRequest(data);

        // TODO: Call new backend command with dockerRequest
        // For now, convert to old format to not break everything
        const legacyRequest = {
          name: dockerRequest.name,
          dbType: dockerRequest.metadata.dbType,
          version: dockerRequest.metadata.version,
          port: dockerRequest.metadata.port,
          username: dockerRequest.metadata.username,
          password: dockerRequest.metadata.password,
          databaseName: dockerRequest.metadata.databaseName,
          persistData: dockerRequest.metadata.persistData,
          enableAuth: dockerRequest.metadata.enableAuth,
          maxConnections: dockerRequest.metadata.maxConnections,
        };

        const newContainer = await create(legacyRequest as any);

        // Mark all steps as completed
        setCompletedSteps([1, 2, 3]);

        // Emit event to notify main window
        try {
          await emit('container-created', { container: newContainer });
        } catch (eventError) {
          console.warn('Error emitting event:', eventError);
        }

        // Close window
        const currentWindow = getCurrentWindow();
        await currentWindow.close();
      } catch (error) {
        // Error is already handled in useContainerActions
        console.error('Error creating container:', error);
      }
    },
    [create, transformFormToDockerRequest],
  );

  return {
    // Form
    form,
    handleSubmit,

    // Steps
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    isCurrentStepValid: isCurrentStepValid(),

    // Actions
    submit,
    cancel,

    // Computed
    hasSelectedDatabase: Boolean(watch('databaseSelection.dbType')),
    isSubmitting: form.formState.isSubmitting,
  };
}

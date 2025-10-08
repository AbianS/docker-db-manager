import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { databasesApi } from '@/features/databases/api/databases.api';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import type { DockerRunRequest } from '@/features/databases/types/docker.types';
import { FORM_STEPS } from '../types/form-steps';

/**
 * Form data structure (no Zod schema needed)
 * Validation is handled by providers and field-level rules
 */
export interface CreateDatabaseFormData {
  databaseSelection: {
    dbType?: string;
  };
  containerConfiguration: Record<string, any>;
}

/**
 * Hook to manage the container creation wizard
 * Responsibility: Wizard logic (steps, validation, submit)
 */
export function useContainerCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Form setup - NO ZOD RESOLVER
  // Validation is handled by individual field rules from providers
  const form = useForm<CreateDatabaseFormData>({
    defaultValues: {
      databaseSelection: {
        dbType: undefined,
      },
      containerConfiguration: {
        name: '',
        port: undefined, // Will be set by provider
        version: '', // Will be set by provider
        persistData: true,
        enableAuth: true,
      },
    },
    mode: 'onChange',
  });

  const { handleSubmit, watch, setValue } = form;

  // Watch for database type changes to apply provider defaults
  const selectedDbType = watch('databaseSelection.dbType');

  /**
   * Apply provider defaults when database type changes
   */
  useEffect(() => {
    if (!selectedDbType) return;

    const provider = databaseRegistry.get(selectedDbType);
    if (!provider) return;

    // Apply default port
    setValue('containerConfiguration.port', provider.defaultPort);

    // Apply default version (first in the list)
    if (provider.versions.length > 0) {
      setValue('containerConfiguration.version', provider.versions[0]);
    }

    // Apply default username if provider has one
    const defaultUsername = provider.getDefaultUsername?.();
    if (defaultUsername) {
      setValue('containerConfiguration.username', defaultUsername);
    }

    // Get all fields from provider and apply their default values
    const allFields = [
      ...provider.getBasicFields(),
      ...provider.getAuthenticationFields(),
      ...provider.getAdvancedFields().flatMap((group) => group.fields),
    ];

    // Apply default values from fields
    for (const field of allFields) {
      if (field.defaultValue !== undefined) {
        setValue(
          `containerConfiguration.${field.name}` as any,
          field.defaultValue,
        );
      }
    }

    console.log(
      `✅ Applied defaults for ${provider.name}: port=${provider.defaultPort}, version=${provider.versions[0]}`,
    );
  }, [selectedDbType, setValue]);

  /**
   * Advance to next step - No Zod validation, just check if required fields exist
   */
  const nextStep = useCallback(() => {
    let canProceed = false;

    if (currentStep === 1) {
      // Step 1: Must have selected a database
      canProceed = Boolean(watch('databaseSelection.dbType'));
    } else if (currentStep === 2) {
      // Step 2: Check basic required fields
      const config = watch('containerConfiguration');
      canProceed = !!(config.name && config.port && config.version);
    } else {
      canProceed = true;
    }

    if (canProceed) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }
      if (currentStep < FORM_STEPS.length) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, completedSteps, watch]);

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
    (data: CreateDatabaseFormData): DockerRunRequest => {
      const { databaseSelection, containerConfiguration } = data;

      if (!databaseSelection.dbType) {
        throw new Error('Database type not selected');
      }

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
    async (data: CreateDatabaseFormData) => {
      try {
        const { databaseSelection, containerConfiguration } = data;

        if (!databaseSelection.dbType) {
          throw new Error('Database type not selected');
        }

        // Get the provider for validation
        const provider = databaseRegistry.get(databaseSelection.dbType);
        if (!provider) {
          throw new Error(
            `No provider found for database type: ${databaseSelection.dbType}`,
          );
        }

        // Validate with provider before creating
        const validation = provider.validateConfig(containerConfiguration);
        if (!validation.valid) {
          // Show validation errors
          const errorMessage = validation.errors.join('\n');
          console.error('❌ Validation errors:', validation.errors);
          alert(`Validation failed:\n${errorMessage}`);
          throw new Error(`Validation failed: ${errorMessage}`);
        }

        const dockerRequest = transformFormToDockerRequest(data);

        // Use the unified databases API
        console.log('🚀 Creating container with Docker args:', dockerRequest);
        const newContainer = await databasesApi.create(dockerRequest);

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
        // Error is already handled by invoke wrapper
        console.error('Error creating container:', error);
        throw error;
      }
    },
    [transformFormToDockerRequest],
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

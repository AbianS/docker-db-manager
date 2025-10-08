import { motion } from 'framer-motion';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  DynamicFieldGroups,
  DynamicFormSection,
} from '@/features/databases/components/dynamic-form-section';
import { useDatabaseProvider } from '@/features/databases/registry/database-registry';
// Ensure providers are registered
import '@/features/databases/providers';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../shared/components/ui/accordion';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../shared/components/ui/form';
import { Input } from '../../../shared/components/ui/input';
import { CreateDatabaseFormValidation } from '../schemas/database-form.schema';

interface Props {
  form: UseFormReturn<CreateDatabaseFormValidation>;
  isSubmitting: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

export function ContainerConfigurationStep({ form, isSubmitting }: Props) {
  const selectedDbType = form.watch('databaseSelection.dbType');
  const provider = useDatabaseProvider(selectedDbType);

  // Set default values when database type changes
  React.useEffect(() => {
    if (provider) {
      // Set default port
      const currentPort = form.getValues('containerConfiguration.port');
      if (!currentPort) {
        form.setValue('containerConfiguration.port', provider.defaultPort);
      }

      // Set default version (first in the list)
      const currentVersion = form.getValues('containerConfiguration.version');
      if (!currentVersion && provider.versions.length > 0) {
        form.setValue('containerConfiguration.version', provider.versions[0]);
      }

      // Set default authentication values
      const authFields = provider.getAuthenticationFields();
      authFields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          const currentValue = form.getValues(
            `containerConfiguration.${field.name}` as any,
          );
          if (currentValue === undefined || currentValue === '') {
            form.setValue(
              `containerConfiguration.${field.name}` as any,
              field.defaultValue,
            );
          }
        }
      });
    }
  }, [selectedDbType, provider, form]);

  if (!provider) {
    return (
      <div className="text-center text-muted-foreground">
        Please select a database type first
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2">
      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="text-sm font-medium text-foreground text-center mb-4">
            {provider.name} Database Configuration
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Accordion
            type="multiple"
            defaultValue={['container', 'auth']}
            className="w-full"
          >
            {/* Section 1: Basic Container Configuration */}
            <AccordionItem value="container">
              <AccordionTrigger className="text-sm font-medium">
                Basic Configuration
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Container Name */}
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="containerConfiguration.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Container Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`my-${provider.id.toLowerCase()}-db`}
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Port */}
                  <div>
                    <FormField
                      control={form.control}
                      name="containerConfiguration.port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={provider.defaultPort.toString()}
                              disabled={isSubmitting}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dynamic Basic Fields from Provider */}
                  <div className="col-span-2">
                    <DynamicFormSection
                      form={form}
                      fields={provider.getBasicFields()}
                      fieldPrefix="containerConfiguration."
                    />
                  </div>
                </div>

                {/* Persistence Option */}
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="containerConfiguration.persistData"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Persist data with Docker volume
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Data will be preserved when container is removed
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Authentication (Dynamic from Provider) */}
            {provider.requiresAuth() && (
              <AccordionItem value="auth">
                <AccordionTrigger className="text-sm font-medium">
                  Authentication
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <DynamicFormSection
                    form={form}
                    fields={provider.getAuthenticationFields()}
                    fieldPrefix="containerConfiguration."
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section 3: Advanced Configuration (Dynamic from Provider) */}
            {provider.getAdvancedFields().length > 0 && (
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm font-medium">
                  Advanced Configuration
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <DynamicFieldGroups
                    form={form}
                    groups={provider.getAdvancedFields()}
                  />
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </motion.div>
      </motion.div>
    </div>
  );
}

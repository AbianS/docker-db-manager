import { motion } from 'framer-motion';
import { UseFormReturn } from 'react-hook-form';
import {
  DynamicFieldGroups,
  DynamicFormSection,
} from '@/features/databases/components/dynamic-form-section';
import { useDatabaseProvider } from '@/features/databases/registry/database-registry';
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
} from '../../../shared/components/ui/form';
import type { CreateDatabaseFormData } from '../hooks/use-container-creation-wizard';

interface Props {
  form: UseFormReturn<CreateDatabaseFormData>;
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

export function ContainerConfigurationStep({ form }: Props) {
  const selectedDbType = form.watch('databaseSelection.dbType');
  const provider = useDatabaseProvider(selectedDbType);

  // Note: Default values are now applied in use-container-creation-wizard.ts
  // when the database type is selected

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
                {/* Dynamic Basic Fields from Provider (includes name, port, version, etc.) */}
                <DynamicFormSection
                  form={form}
                  fields={provider.getBasicFields({ isEditMode: false })}
                  fieldPrefix="containerConfiguration."
                />

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

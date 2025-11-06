import type { UseFormReturn } from 'react-hook-form';
import {
  DynamicFieldGroups,
  DynamicFormSection,
} from '@/features/databases/components/dynamic-form-section';
import type { DatabaseProvider } from '@/features/databases/registry/database-provider.interface';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/components/ui/form';
import type { Container } from '@/shared/types/container';

interface EditContainerFormProps {
  container: Container;
  provider: DatabaseProvider;
  form: UseFormReturn<any>;
}

/**
 * Pure form component for editing container configuration
 * Renders the form fields without handling submission logic
 * Submit handling is managed by parent component (ConfigurationTab)
 */
export function EditContainerForm({
  provider,
  form,
}: EditContainerFormProps) {

  return (
    <Form {...form}>
      <div className="space-y-4">
        <Accordion
          type="multiple"
          defaultValue={['container', 'auth', 'advanced']}
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
                fields={provider.getBasicFields({
                  isEditMode: true,
                })}
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
      </div>
    </Form>
  );
}

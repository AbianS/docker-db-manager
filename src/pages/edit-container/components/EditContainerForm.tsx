import { Copy, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  DynamicFieldGroups,
  DynamicFormSection,
} from '@/features/databases/components/dynamic-form-section';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { useDatabaseEditWizard } from '../hooks/use-database-edit-wizard';

// Ensure providers are registered
import '@/features/databases/providers';

interface EditContainerFormProps {
  containerId: string;
}

/**
 * Presentation component for editing container
 * Responsibility: Only rendering and UI events
 */
export function EditContainerForm({ containerId }: EditContainerFormProps) {
  const { container, loading, saving, form, save, cancel } =
    useDatabaseEditWizard(containerId);

  const {
    handleSubmit,
    formState: { isDirty },
  } = form;

  // Get provider for dynamic fields
  const provider = container ? databaseRegistry.get(container.dbType) : null;

  const handleCopyConnectionString = async () => {
    if (!container || !provider) return;

    const connectionString = provider.getConnectionString(container);

    try {
      await navigator.clipboard.writeText(connectionString);
      toast.success('Connection string copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error copying connection string');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!container || !provider) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          {!container ? 'Database not found' : 'Provider not found'}
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{container.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{container.dbType}</Badge>
                <Badge
                  variant={
                    container.status === 'running' ? 'default' : 'secondary'
                  }
                >
                  {container.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content - Same structure as create form but without wizard */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(save)} className="space-y-6 max-w-2xl">
            <Accordion
              type="multiple"
              defaultValue={['container', 'auth', 'connection']}
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
                    fields={provider.getBasicFields()}
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

              {/* Section 4: Connection String */}
              <AccordionItem value="connection">
                <AccordionTrigger className="text-sm font-medium">
                  Connection String
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-4">
                  <div className="flex gap-2">
                    <Input
                      value={provider.getConnectionString(container)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyConnectionString}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(save)}
              disabled={saving || !isDirty}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}

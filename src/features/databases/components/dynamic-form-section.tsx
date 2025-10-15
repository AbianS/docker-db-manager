import { UseFormReturn } from 'react-hook-form';
import type { FieldGroup, FormField } from '../types/form.types';
import { DynamicFormField } from './dynamic-form-field';

interface SectionProps {
  form: UseFormReturn<any>;
  fields: FormField[];
  fieldPrefix?: string;
}

/**
 * Dynamic Form Section
 * Renders a list of fields
 */
export function DynamicFormSection({
  form,
  fields,
  fieldPrefix = '',
}: SectionProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <DynamicFormField
          key={field.name}
          form={form}
          field={field}
          fieldPrefix={fieldPrefix}
        />
      ))}
    </div>
  );
}

interface GroupsProps {
  form: UseFormReturn<any>;
  groups: FieldGroup[];
}

/**
 * Dynamic Field Groups
 * Renders grouped fields with labels and descriptions
 */
export function DynamicFieldGroups({ form, groups }: GroupsProps) {
  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-4 bg-card/50">
          <div>
            <h3 className="font-medium text-sm">{group.label}</h3>
            {group.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {group.description}
              </p>
            )}
          </div>
          <DynamicFormSection
            form={form}
            fields={group.fields}
            fieldPrefix="containerConfiguration."
          />
        </div>
      ))}
    </div>
  );
}

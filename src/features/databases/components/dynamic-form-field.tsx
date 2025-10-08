import { Controller, UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { FormField } from '../types/form.types';

interface Props {
  form: UseFormReturn<any>;
  field: FormField;
  fieldPrefix?: string;
}

/**
 * Dynamic Form Field Component
 * Renders different input types based on field configuration
 */
export function DynamicFormField({ form, field, fieldPrefix = '' }: Props) {
  const {
    control,
    formState: { errors },
  } = form;

  const fullFieldName = fieldPrefix + field.name;
  const error = errors[fullFieldName];

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && (
        <Label htmlFor={fullFieldName}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Controller
        name={fullFieldName}
        control={control}
        defaultValue={field.defaultValue}
        rules={{
          required: field.required ? `${field.label} is required` : undefined,
          minLength:
            field.type !== 'checkbox' &&
            field.type !== 'select' &&
            field.validation?.min
              ? {
                  value: field.validation.min,
                  message:
                    field.validation.message ||
                    `Minimum length is ${field.validation.min}`,
                }
              : undefined,
          maxLength:
            field.type !== 'checkbox' &&
            field.type !== 'select' &&
            field.validation?.max
              ? {
                  value: field.validation.max,
                  message:
                    field.validation.message ||
                    `Maximum length is ${field.validation.max}`,
                }
              : undefined,
        }}
        render={({ field: controllerField }) => {
          if (field.type === 'text' || field.type === 'password') {
            return (
              <Input
                {...controllerField}
                id={fullFieldName}
                type={field.type}
                placeholder={field.placeholder}
                readOnly={field.readonly}
                className={error ? 'border-destructive' : ''}
              />
            );
          }

          if (field.type === 'number') {
            return (
              <Input
                {...controllerField}
                id={fullFieldName}
                type="number"
                placeholder={field.placeholder}
                readOnly={field.readonly}
                className={error ? 'border-destructive' : ''}
                onChange={(e) =>
                  controllerField.onChange(Number(e.target.value))
                }
              />
            );
          }

          if (field.type === 'select') {
            return (
              <Select
                value={controllerField.value}
                onValueChange={controllerField.onChange}
              >
                <SelectTrigger
                  id={fullFieldName}
                  className={error ? 'border-destructive' : ''}
                >
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (field.type === 'checkbox') {
            return (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={fullFieldName}
                  checked={controllerField.value}
                  onCheckedChange={controllerField.onChange}
                />
                <Label htmlFor={fullFieldName} className="font-normal">
                  {field.label}
                </Label>
              </div>
            );
          }

          return <div>Unsupported field type</div>;
        }}
      />

      {field.helpText && !error && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}

      {error && (
        <p className="text-xs text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}

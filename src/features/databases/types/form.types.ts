/**
 * Form field types for dynamic form generation
 */

export interface FormFieldBase {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  helpText?: string;
  defaultValue?: string | number | boolean;
}

export interface TextFormField extends FormFieldBase {
  type: 'text' | 'password' | 'number';
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface SelectFormField extends FormFieldBase {
  type: 'select';
  options: string[];
}

export interface CheckboxFormField extends FormFieldBase {
  type: 'checkbox';
  defaultValue?: boolean;
}

export type FormField = TextFormField | SelectFormField | CheckboxFormField;

export interface FieldGroup {
  label: string;
  description?: string;
  fields: FormField[];
}

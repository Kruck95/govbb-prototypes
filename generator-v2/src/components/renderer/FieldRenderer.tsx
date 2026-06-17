import type { Field } from '../../types/schema';
import { TextField } from './fields/TextField';
import { DateField } from './fields/DateField';
import { RadioGroup } from './fields/RadioGroup';
import { Checkbox } from './fields/Checkbox';
import { SelectField } from './fields/SelectField';
import { TextareaField } from './fields/TextareaField';
import { FileField } from './fields/FileField';
import { StaticField } from './fields/StaticField';

interface FieldRendererProps {
  field: Field;
  data: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
}

/**
 * Dispatches a Field to the correct concrete component based on type.
 * Keeps the FormRenderer free of type-switch noise so adding a new
 * field type is one entry here plus one new component file.
 */
export function FieldRenderer({ field, data, onChange }: FieldRendererProps) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      return (
        <TextField
          field={field}
          value={(data[field.id] as string) ?? ''}
          onChange={(v) => onChange(field.id, v)}
        />
      );
    case 'date': {
      const day = (data[`${field.id}-day`] as string) ?? '';
      const month = (data[`${field.id}-month`] as string) ?? '';
      const year = (data[`${field.id}-year`] as string) ?? '';
      return (
        <DateField
          field={field}
          day={day}
          month={month}
          year={year}
          onChange={(part, v) => onChange(`${field.id}-${part}`, v)}
        />
      );
    }
    case 'radio':
      return (
        <RadioGroup
          field={field}
          value={(data[field.id] as string) ?? ''}
          onChange={(v) => onChange(field.id, v)}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          field={field}
          checked={!!data[field.id]}
          onChange={(v) => onChange(field.id, v)}
        />
      );
    case 'select':
      return (
        <SelectField
          field={field}
          value={(data[field.id] as string) ?? ''}
          onChange={(v) => onChange(field.id, v)}
        />
      );
    case 'textarea':
      return (
        <TextareaField
          field={field}
          value={(data[field.id] as string) ?? ''}
          onChange={(v) => onChange(field.id, v)}
        />
      );
    case 'file':
      return <FileField field={field} />;
    case 'static':
      return <StaticField field={field} />;
  }
}

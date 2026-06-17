import type { Field } from '../../../types/schema';
import { normalizeOptions } from './options';

interface Props { field: Field; value: string; onChange: (v: string) => void; }

export function SelectField({ field, value, onChange }: Props) {
  const opts = normalizeOptions(field.options);
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={field.id} className="block text-[1.25rem] font-bold text-bb-black-00">
        {field.label}
      </label>
      {field.hint && <p className="text-[1rem] text-bb-mid-grey-00">{field.hint}</p>}
      <div className="relative inline-flex w-full items-center rounded-sm border-2 border-bb-black-00 bg-bb-white-00 transition-all hover:shadow-form-hover focus-within:ring-4 focus-within:ring-bb-teal-100">
        <select
          id={field.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer rounded-[inherit] bg-transparent p-s text-[1.25rem] outline-none"
        >
          <option value="">Choose an option</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

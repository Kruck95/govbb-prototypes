import type { Field } from '../../../types/schema';
import { isNationalIdField, formatNrn, NRN_EXAMPLE } from '../../../lib/id-format';

interface Props { field: Field; value: string; onChange: (v: string) => void; }

export function TextField({ field, value, onChange }: Props) {
  const inputType = field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text';
  const isId = isNationalIdField(field);
  const hint = field.hint ?? (isId ? `For example, ${NRN_EXAMPLE}` : undefined);
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={field.id} className="block text-[1.25rem] font-bold leading-normal text-bb-black-00">
        {field.label}
      </label>
      {hint && <p className="text-[1rem] leading-normal text-bb-mid-grey-00">{hint}</p>}
      <div className="relative inline-flex w-full items-center gap-2 rounded-sm border-2 border-bb-black-00 bg-bb-white-00 transition-all hover:shadow-form-hover focus-within:ring-4 focus-within:ring-bb-teal-100">
        <input
          type={inputType}
          id={field.id}
          name={field.id}
          inputMode={isId ? 'numeric' : field.inputmode}
          maxLength={isId ? 11 : field.validation?.maxLength}
          aria-required={field.required || undefined}
          placeholder={field.placeholder ?? (isId ? NRN_EXAMPLE : undefined)}
          value={value}
          onChange={(e) => onChange(isId ? formatNrn(e.target.value) : e.target.value)}
          className="w-full min-w-0 rounded-[inherit] p-s text-[1.25rem] outline-none"
        />
      </div>
    </div>
  );
}

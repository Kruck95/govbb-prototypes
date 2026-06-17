import type { Field } from '../../../types/schema';
import { normalizeOptions } from './options';

interface Props { field: Field; value: string; onChange: (v: string) => void; }

export function RadioGroup({ field, value, onChange }: Props) {
  const opts = normalizeOptions(field.options);
  return (
    <fieldset className="flex flex-col items-start gap-s">
      <legend className="text-[1.25rem] font-bold text-bb-black-00">{field.label}</legend>
      {field.hint && <p className="text-[1rem] text-bb-mid-grey-00">{field.hint}</p>}
      {opts.map((o) => {
        const checked = value === o.value;
        return (
          <label key={o.value} className="flex cursor-pointer items-center gap-5">
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(o.value)}
              className={`relative inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-bb-black-00 bg-bb-white-00 outline-none transition-all hover:shadow-form-hover focus-visible:ring-4 focus-visible:ring-bb-teal-100`}
            >
              {checked && <span className="size-5 rounded-full bg-bb-black-00" />}
            </button>
            <span className="text-[1.25rem] text-bb-black-00">{o.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

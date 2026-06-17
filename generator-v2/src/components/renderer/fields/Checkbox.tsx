import type { Field } from '../../../types/schema';

interface Props { field: Field; checked: boolean; onChange: (v: boolean) => void; }

export function Checkbox({ field, checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-sm border-2 border-bb-black-00 bg-bb-white-00 outline-none transition-all hover:shadow-form-hover focus-visible:ring-4 focus-visible:ring-bb-teal-100"
      >
        {checked && <span className="text-[1.5rem] leading-none">✓</span>}
      </button>
      <span className="flex-1 text-[1.25rem] text-bb-black-00">{field.label}</span>
    </label>
  );
}

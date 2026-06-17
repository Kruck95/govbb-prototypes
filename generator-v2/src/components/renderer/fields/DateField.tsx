import type { Field } from '../../../types/schema';

interface Props {
  field: Field;
  day: string; month: string; year: string;
  onChange: (part: 'day' | 'month' | 'year', v: string) => void;
}

export function DateField({ field, day, month, year, onChange }: Props) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-[1.25rem] font-bold leading-normal text-bb-black-00">{field.label}</p>
      <p className="text-[1.25rem] leading-normal text-bb-mid-grey-00">
        {field.hint ?? 'For example, 27 03 2007'}
      </p>
      <div className="flex flex-wrap items-end gap-s">
        <DateInput id={`${field.id}-day`} label="Day" width="5rem" value={day} onChange={(v) => onChange('day', v)} />
        <DateInput id={`${field.id}-month`} label="Month" width="5rem" value={month} onChange={(v) => onChange('month', v)} />
        <DateInput id={`${field.id}-year`} label="Year" width="7rem" value={year} onChange={(v) => onChange('year', v)} />
      </div>
    </div>
  );
}

function DateInput({ id, label, width, value, onChange }: { id: string; label: string; width: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="text-[1.25rem] font-bold text-bb-black-00">{label}</label>
      <div
        className="relative inline-flex items-center rounded-sm border-2 border-bb-black-00 bg-bb-white-00 transition-all hover:shadow-form-hover focus-within:ring-4 focus-within:ring-bb-teal-100"
        style={{ width }}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-[inherit] p-s text-[1.25rem] outline-none"
        />
      </div>
    </div>
  );
}

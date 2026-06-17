import type { Field } from '../../../types/schema';

interface Props { field: Field; }

export function FileField({ field }: Props) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={field.id} className="block text-[1.25rem] font-bold text-bb-black-00">
        {field.label}
      </label>
      {field.hint && <p className="text-[1rem] text-bb-mid-grey-00">{field.hint}</p>}
      <input
        id={field.id}
        type="file"
        className="block text-[1rem] file:mr-4 file:cursor-pointer file:rounded-sm file:border-2 file:border-bb-black-00 file:bg-bb-white-00 file:px-s file:py-xs file:text-[1rem] file:font-semibold hover:file:bg-bb-teal-10"
      />
    </div>
  );
}

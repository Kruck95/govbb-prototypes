import type { Field } from '../../../types/schema';

export function StaticField({ field }: { field: Field }) {
  return (
    <div className="border-l-4 border-bb-blue-40 bg-bb-blue-10 p-s text-[1.1rem]">{field.label}</div>
  );
}

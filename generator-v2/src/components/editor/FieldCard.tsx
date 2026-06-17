import type { Confidence, Field } from '../../types/schema';

interface FieldCardProps {
  field: Field;
  selected: boolean;
  onSelect: () => void;
  onEditDetails: () => void;
  onToggleRequired: () => void;
  onDelete: () => void;
}

const TYPE_ICON: Record<string, string> = {
  text: '📝',
  email: '📧',
  tel: '📞',
  date: '📅',
  radio: '🔘',
  checkbox: '☑',
  select: '▾',
  textarea: '📝',
  file: '📎',
  static: '📜',
};

const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  tel: 'Phone',
  date: 'Date',
  radio: 'Radio buttons',
  checkbox: 'Checkbox',
  select: 'Dropdown',
  textarea: 'Long text',
  file: 'File upload',
  static: 'Static text',
};

export function FieldCard({
  field,
  selected,
  onSelect,
  onEditDetails,
  onToggleRequired,
  onDelete,
}: FieldCardProps) {
  const isLow = field.confidence === 'low';
  return (
    <div
      onClick={onSelect}
      className={`group relative mb-xs cursor-pointer rounded-md bg-bb-white-00 p-s transition-shadow hover:shadow-sm ${
        selected
          ? 'border-2 border-bb-teal-00 p-[calc(theme(spacing.s)-1px)]'
          : 'border border-bb-grey-00 hover:border-bb-black-00'
      } ${isLow ? 'border-l-4 border-l-bb-red-00' : ''}`}
    >
      {/* Top row: drag, icon, label, confidence dot, overflow */}
      <div className="mb-xs flex items-center gap-2">
        <span aria-label="Drag to reorder" className="w-5 cursor-grab select-none text-center text-bb-blue-40 hover:text-bb-mid-grey-00">⠿</span>
        <span aria-hidden className="w-6 text-center">{TYPE_ICON[field.type] ?? '•'}</span>
        <span className="flex-1 truncate text-[0.9375rem] font-semibold text-bb-black-00">
          {prettyName(field.id)}
        </span>
        <ConfidenceDot c={field.confidence} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete field"
          className="rounded-sm px-2 py-1 text-bb-mid-grey-00 hover:bg-bb-grey-00"
        >⋮</button>
      </div>

      {/* Label preview */}
      <p className="ml-12 text-[0.8125rem] text-bb-mid-grey-00">"{field.label}"</p>
      {field.hint && (
        <p className="ml-12 text-[0.8125rem] text-bb-mid-grey-00">Help: {field.hint}</p>
      )}
      {isLow && (
        <p className="ml-12 mt-xs text-[0.8125rem] font-semibold text-bb-red-00">⚠ Confidence low — verify against source</p>
      )}

      {/* Actions */}
      <div className="ml-12 mt-xs flex items-center gap-3 text-[0.8125rem]">
        <label className="inline-flex cursor-pointer items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={onToggleRequired}
            className="size-[0.875rem] accent-bb-teal-00"
          />
          Required
        </label>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEditDetails(); }}
          className="text-bb-teal-00 underline underline-offset-2 hover:no-underline"
        >Edit details</button>
        <span className="text-bb-mid-grey-00">·</span>
        <span className="text-bb-mid-grey-00">{TYPE_LABEL[field.type] ?? field.type}</span>
      </div>
    </div>
  );
}

function ConfidenceDot({ c }: { c: Confidence | undefined }) {
  const cls = c === 'high' ? 'bg-bb-green-100' : c === 'medium' ? 'bg-bb-yellow-100' : c === 'low' ? 'bg-bb-red-100' : 'bg-bb-grey-00';
  const label = c ? `${c} confidence` : 'no confidence data';
  return <span aria-label={label} title={label} className={`size-2 shrink-0 rounded-full ${cls}`} />;
}

function prettyName(id: string): string {
  return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

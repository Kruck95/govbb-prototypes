import { useEffect, useRef } from 'react';
import type { Field, FieldType } from '../../types/schema';

interface FieldDetailsDrawerProps {
  field: Field | null;
  onClose: () => void;
  onChange: (next: Field) => void;
  onDelete: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: '📝 Text' },
  { value: 'email', label: '📧 Email' },
  { value: 'tel', label: '📞 Phone' },
  { value: 'date', label: '📅 Date (Day / Month / Year)' },
  { value: 'radio', label: '🔘 Radio buttons' },
  { value: 'checkbox', label: '☑ Checkbox' },
  { value: 'select', label: '▾ Dropdown' },
  { value: 'textarea', label: '📝 Long text' },
  { value: 'file', label: '📎 File upload' },
  { value: 'static', label: '📜 Static text' },
];

export function FieldDetailsDrawer({ field, onClose, onChange, onDelete }: FieldDetailsDrawerProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (field) {
      const t = setTimeout(() => titleRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [field]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (field) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [field, onClose]);

  const open = !!field;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-full overflow-y-auto border-l-2 border-bb-grey-00 bg-bb-white-00 shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {field && (
          <>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-bb-grey-00 bg-[#f7f9fc] px-5 py-4">
              <h2 className="text-[1rem] font-bold">Edit field · {prettyName(field.id)}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-sm px-2 py-1 text-bb-mid-grey-00 hover:bg-bb-grey-00">✕</button>
            </header>

            <div className="space-y-5 px-5 py-5">
              <Section title="Basics">
                <Labelled label="Field type">
                  <select
                    value={field.type}
                    onChange={(e) => onChange({ ...field, type: e.target.value as FieldType })}
                    className="w-full rounded-sm border-[1.5px] border-bb-blue-40 bg-bb-white-00 p-2 text-[0.875rem] focus:border-bb-teal-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100/40"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Labelled>
                <Labelled label="Question shown to citizen">
                  <input
                    ref={titleRef}
                    type="text"
                    value={field.label}
                    onChange={(e) => onChange({ ...field, label: e.target.value })}
                    className="w-full rounded-sm border-[1.5px] border-bb-blue-40 bg-bb-white-00 p-2 text-[0.875rem] focus:border-bb-teal-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100/40"
                  />
                </Labelled>
                <Labelled label="Help text">
                  <textarea
                    value={field.hint ?? ''}
                    onChange={(e) => onChange({ ...field, hint: e.target.value || undefined })}
                    rows={2}
                    className="w-full rounded-sm border-[1.5px] border-bb-blue-40 bg-bb-white-00 p-2 text-[0.875rem] focus:border-bb-teal-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100/40"
                  />
                </Labelled>
                <Labelled label="Placeholder">
                  <input
                    type="text"
                    value={field.placeholder ?? ''}
                    onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })}
                    className="w-full rounded-sm border-[1.5px] border-bb-blue-40 bg-bb-white-00 p-2 text-[0.875rem] focus:border-bb-teal-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100/40"
                  />
                </Labelled>
              </Section>

              <Section title="Validation">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[0.875rem]">
                  <input
                    type="checkbox"
                    checked={!!field.required}
                    onChange={() => onChange({ ...field, required: !field.required })}
                    className="size-[0.875rem] accent-bb-teal-00"
                  />
                  Required
                </label>
                <Labelled label="Pattern (regex)">
                  <input
                    type="text"
                    placeholder="e.g. ^[0-9]{6}-[0-9]{4}$"
                    value={field.validation?.pattern ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, pattern: e.target.value || undefined },
                      })
                    }
                    className="w-full rounded-sm border-[1.5px] border-bb-blue-40 bg-bb-white-00 p-2 font-mono text-[0.8125rem] focus:border-bb-teal-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100/40"
                  />
                </Labelled>
                <Labelled label="Maximum length">
                  <input
                    type="number"
                    value={field.validation?.maxLength ?? ''}
                    onChange={(e) => {
                      const n = e.target.value ? Number(e.target.value) : undefined;
                      onChange({ ...field, validation: { ...field.validation, maxLength: n } });
                    }}
                    className="w-full rounded-sm border-[1.5px] border-bb-blue-40 bg-bb-white-00 p-2 text-[0.875rem] focus:border-bb-teal-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100/40"
                  />
                </Labelled>
              </Section>

              <Section title="Conditional logic">
                <p className="text-[0.8125rem] text-bb-mid-grey-00">Show this field only when…</p>
                <button
                  type="button"
                  className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1 text-[0.8125rem] font-semibold hover:bg-[#f4f4f4]"
                  onClick={() => alert('Condition builder — phase 2')}
                >
                  + Add condition
                </button>
              </Section>

              <Section title="AI assist">
                <div className="flex flex-wrap gap-1.5">
                  <AssistChip label="✦ Rewrite in plain language" />
                  <AssistChip label="✦ Suggest help text" />
                  <AssistChip label="✦ Generate sample answer" />
                </div>
              </Section>

              <Section title="Source">
                <p className="text-[0.8125rem] text-bb-mid-grey-00">
                  {field.sourcePage ? <>Extracted from <strong>page {field.sourcePage}</strong></> : 'No source page recorded'} ·{' '}
                  {field.confidence ?? 'no'} confidence
                </p>
              </Section>
            </div>

            <footer className="sticky bottom-0 flex items-center justify-between border-t border-bb-grey-00 bg-[#f7f9fc] px-5 py-4">
              <button
                type="button"
                onClick={onDelete}
                className="text-[0.8125rem] font-semibold text-bb-red-00 hover:underline"
              >🗑 Delete field</button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-3 py-1.5 text-[0.875rem] font-semibold hover:bg-[#f4f4f4]"
                >Cancel</button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-sm bg-bb-teal-00 px-3 py-1.5 text-[0.875rem] font-semibold text-bb-white-00 hover:bg-[#1a777d]"
                >Apply</button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#f0f2f5] pb-5 last:border-b-0">
      <h3 className="mb-2 text-[0.75rem] font-bold uppercase tracking-wide text-bb-mid-grey-00">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[0.8125rem] font-semibold">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function AssistChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-full border border-bb-teal-40 bg-bb-teal-10 px-2.5 py-1 text-[0.75rem] font-semibold text-bb-teal-00 hover:bg-bb-teal-40"
      onClick={() => alert('AI assist call — phase 2')}
    >
      {label}
    </button>
  );
}

function prettyName(id: string): string {
  return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

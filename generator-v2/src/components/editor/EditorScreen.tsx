import { useMemo, useState } from 'react';
import type { Field, FormSchema, SourceDocument } from '../../types/schema';
import { ChromeFrame } from '../chrome/ChromeFrame';
import { PageTabs } from './PageTabs';
import { SourcePane } from './SourcePane';
import { PreviewPane } from './PreviewPane';
import { FieldCard } from './FieldCard';
import { FieldDetailsDrawer } from './FieldDetailsDrawer';
import { SaveModal } from '../save/SaveModal';

interface EditorScreenProps {
  initialSchema: FormSchema;
  source: SourceDocument | null;
  onBack: () => void;
}

type MobilePane = 'source' | 'edit' | 'preview';

export function EditorScreen({ initialSchema, source, onBack }: EditorScreenProps) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema);
  const [currentPageId, setCurrentPageId] = useState<string>(
    initialSchema.flow.find((id) => initialSchema.pages[id]?.type === 'question') ?? initialSchema.flow[0],
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [drawerFieldId, setDrawerFieldId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('edit');
  const [activeSourcePage, setActiveSourcePage] = useState<number>(1);
  const [saveOpen, setSaveOpen] = useState(false);

  const page = schema.pages[currentPageId];
  const fields = page?.fields ?? [];
  const drawerField = useMemo(
    () => (drawerFieldId ? fields.find((f) => f.id === drawerFieldId) ?? null : null),
    [drawerFieldId, fields],
  );

  function updateField(id: string, patch: Partial<Field>) {
    setSchema((s) => withFieldUpdate(s, currentPageId, id, patch));
  }

  function updatePageTitle(title: string) {
    setSchema((s) => {
      const p = s.pages[currentPageId];
      if (!p) return s;
      return { ...s, pages: { ...s.pages, [currentPageId]: { ...p, title } } };
    });
  }

  function replaceField(next: Field) {
    setSchema((s) => withFieldUpdate(s, currentPageId, next.id, next, /* replace */ true));
  }

  function deleteField(id: string) {
    setSchema((s) => {
      const p = s.pages[currentPageId];
      if (!p?.fields) return s;
      return {
        ...s,
        pages: { ...s.pages, [currentPageId]: { ...p, fields: p.fields.filter((f) => f.id !== id) } },
      };
    });
    if (drawerFieldId === id) setDrawerFieldId(null);
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  const counts = useMemo(() => countConfidences(fields), [fields]);

  return (
    <ChromeFrame
      fullWidth
      bannerSlot={
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.875rem]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="text-bb-teal-00 underline underline-offset-2 hover:no-underline"
            >◀ Back</button>
            <span className="text-bb-mid-grey-00">·</span>
            <span className="text-bb-mid-grey-00">Form Generator (Alpha)</span>
            <span className="text-bb-mid-grey-00">·</span>
            <span>Editing:</span>
            <strong>{schema.meta.title}</strong>
            <span className="text-bb-mid-grey-00">·</span>
            <span className="text-bb-green-00">✓ saved 2 min ago</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-sm px-2 py-1 text-[0.8125rem] font-semibold text-bb-teal-00 hover:bg-bb-teal-10">⌨ Shortcuts (?)</button>
            <button type="button" className="rounded-sm border border-bb-black-00 bg-bb-white-00 px-2.5 py-1 text-[0.875rem] font-semibold hover:bg-[#f4f4f4]">▶ Walk through</button>
            <button
              type="button"
              className="rounded-sm bg-bb-teal-00 px-3 py-1 text-[0.875rem] font-semibold text-bb-white-00 hover:bg-[#1a777d]"
              onClick={() => setSaveOpen(true)}
            >📥 Save</button>
          </div>
        </div>
      }
    >
      <PageTabs schema={schema} currentPageId={currentPageId} onSelectPage={setCurrentPageId} />

      {/* Mobile pane tabs */}
      <div className="flex justify-around gap-2 border-b border-bb-grey-00 bg-[#f4f6f9] px-3 py-2 md:hidden">
        {(['source', 'edit', 'preview'] as MobilePane[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMobilePane(p)}
            className={`rounded-full border px-3 py-1 text-[0.875rem] capitalize ${
              mobilePane === p ? 'border-bb-teal-00 bg-bb-teal-00 text-bb-white-00' : 'border-bb-grey-00 bg-bb-white-00'
            }`}
          >
            {p === 'source' ? '📄 Source' : p === 'edit' ? '✎ Edit' : '👁 Preview'}
          </button>
        ))}
      </div>

      {/* Three-pane workspace — single column on mobile, 20/50/30 from md: */}
      <div className="grid flex-1 min-h-0 grid-cols-1 md:[grid-template-columns:minmax(0,20fr)_minmax(0,50fr)_minmax(0,30fr)]">
        {/* Source pane */}
        <div className={mobilePane === 'source' ? 'block' : 'hidden md:block'}>
          <SourcePane source={source} activePage={activeSourcePage} onSelectPage={setActiveSourcePage} />
        </div>

        {/* Editor pane */}
        <div className={`${mobilePane === 'edit' ? 'block' : 'hidden md:block'} h-full overflow-y-auto bg-bb-white-00 p-5`}>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-bb-mid-grey-00">
                Page {schema.flow.indexOf(currentPageId) + 1} of {schema.flow.length}
              </p>
              <input
                type="text"
                value={page?.title ?? ''}
                onChange={(e) => updatePageTitle(e.target.value)}
                placeholder="Page heading"
                aria-label="Page heading (shown as the H1 on this page)"
                title="Edit the page heading — this is the H1 shown to the user"
                className="-mx-1 w-full rounded-sm border border-transparent bg-transparent px-1 text-[1.375rem] font-bold hover:border-bb-grey-00 focus:border-bb-teal-00 focus:bg-bb-white-00 focus:outline-none focus:ring-2 focus:ring-bb-teal-100"
              />
              <p className="text-[0.8125rem] text-bb-mid-grey-00">
                {fields.length} fields · {counts.high} high · {counts.medium} medium · {counts.low} low confidence
              </p>
            </div>
          </div>

          {fields.length === 0 && (
            <div className="rounded-md border border-dashed border-bb-blue-40 bg-[#f7f9fc] p-5 text-center text-[0.875rem] text-bb-mid-grey-00">
              This page has no fields yet. Add one below.
            </div>
          )}

          {fields.map((f) => (
            <FieldCard
              key={f.id}
              field={f}
              selected={selectedFieldId === f.id}
              onSelect={() => setSelectedFieldId(f.id)}
              onEditDetails={() => setDrawerFieldId(f.id)}
              onToggleRequired={() => updateField(f.id, { required: !f.required })}
              onDelete={() => deleteField(f.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => alert('Add field — phase 2')}
            className="mt-2 w-full rounded-md border-2 border-dashed border-bb-blue-40 bg-bb-white-00 p-3 text-[0.875rem] font-semibold text-bb-teal-00 hover:border-bb-teal-00 hover:bg-bb-teal-10"
          >+ Add field</button>
        </div>

        {/* Preview pane */}
        <div className={mobilePane === 'preview' ? 'block' : 'hidden md:block'}>
          <PreviewPane schema={schema} pageId={currentPageId} />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t border-bb-grey-00 bg-[#f4f6f9] px-4 py-2 text-[0.8125rem]">
        <span className="text-bb-mid-grey-00"><strong className="text-bb-black-00">{schema.flow.length}</strong> pages</span>
        <span className="text-bb-mid-grey-00">·</span>
        <span className="text-bb-mid-grey-00">
          <strong className="text-bb-black-00">{totalFields(schema)}</strong> fields total
        </span>
        <span className="ml-auto text-bb-green-00">✓ Schema valid</span>
      </div>

      <FieldDetailsDrawer
        field={drawerField}
        onClose={() => setDrawerFieldId(null)}
        onChange={replaceField}
        onDelete={() => drawerField && deleteField(drawerField.id)}
      />

      <SaveModal
        open={saveOpen}
        schema={schema}
        onClose={() => setSaveOpen(false)}
        onSchemaChange={setSchema}
      />
    </ChromeFrame>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

function withFieldUpdate(
  schema: FormSchema,
  pageId: string,
  fieldId: string,
  patch: Partial<Field>,
  replace = false,
): FormSchema {
  const p = schema.pages[pageId];
  if (!p?.fields) return schema;
  const fields = p.fields.map((f) => (f.id === fieldId ? (replace ? (patch as Field) : { ...f, ...patch }) : f));
  return { ...schema, pages: { ...schema.pages, [pageId]: { ...p, fields } } };
}

function countConfidences(fields: Field[]): { high: number; medium: number; low: number } {
  const out = { high: 0, medium: 0, low: 0 };
  for (const f of fields) {
    if (f.confidence === 'high') out.high++;
    else if (f.confidence === 'medium') out.medium++;
    else if (f.confidence === 'low') out.low++;
  }
  return out;
}

function totalFields(schema: FormSchema): number {
  let n = 0;
  for (const pid of schema.flow) {
    n += schema.pages[pid]?.fields?.length ?? 0;
  }
  return n;
}

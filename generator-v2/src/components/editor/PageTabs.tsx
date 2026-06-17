import type { FormSchema } from '../../types/schema';

interface PageTabsProps {
  schema: FormSchema;
  currentPageId: string;
  onSelectPage: (id: string) => void;
}

const PAGE_TYPE_BADGE: Record<string, string> = {
  start: '▶',
  question: '',
  declaration: '✎',
  check: '✓',
  confirmation: '🏁',
};

export function PageTabs({ schema, currentPageId, onSelectPage }: PageTabsProps) {
  return (
    <div className="border-b border-bb-grey-00 bg-bb-white-00">
      <div className="tool-container flex flex-wrap items-center gap-1.5 py-2">
        <span className="mr-1 text-[0.75rem] font-bold uppercase tracking-wide text-bb-mid-grey-00">Pages</span>
        {schema.flow.map((id) => {
          const page = schema.pages[id];
          if (!page) return null;
          const active = id === currentPageId;
          const badge = PAGE_TYPE_BADGE[page.type];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectPage(id)}
              className={`rounded-full border px-2.5 py-1 text-[0.875rem] transition-colors ${
                active
                  ? 'border-bb-teal-00 bg-bb-teal-00 font-semibold text-bb-white-00'
                  : 'border-bb-grey-00 bg-bb-white-00 text-bb-black-00 hover:border-bb-teal-00'
              }`}
            >
              {badge && <span className="mr-1 text-[0.7rem] opacity-70">{badge}</span>}
              {page.title ?? id}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => alert('Add page — phase 2')}
          className="rounded-full border border-dashed border-bb-blue-40 px-2.5 py-1 text-[0.875rem] text-bb-mid-grey-00 hover:border-bb-teal-00 hover:text-bb-teal-00"
        >
          + Add page
        </button>
      </div>
    </div>
  );
}

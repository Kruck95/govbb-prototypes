import { useState } from 'react';
import type { FormSchema, Page } from '../../types/schema';
import { FieldRenderer } from './FieldRenderer';
import { isVisible } from './conditions';

interface FormRendererProps {
  schema: FormSchema;
  pageId: string;
  /** Called when the user clicks Continue/Submit. Receives the next page id (or null when done). */
  onNavigate?: (nextPageId: string | null) => void;
}

/**
 * Schema-driven page renderer. Same engine that will produce exported
 * static prototypes — what you see in the editor preview is exactly
 * what citizens will see.
 */
export function FormRenderer({ schema, pageId, onNavigate }: FormRendererProps) {
  const page = schema.pages[pageId];
  const [data, setData] = useState<Record<string, unknown>>({});

  if (!page) {
    return <p className="p-s text-bb-red-00">Page not found: {pageId}</p>;
  }

  const flowIdx = schema.flow.indexOf(pageId);
  const isFirst = flowIdx === 0;
  const isLast = flowIdx === schema.flow.length - 1;
  const nextPageId = flowIdx >= 0 && flowIdx < schema.flow.length - 1 ? schema.flow[flowIdx + 1] : null;
  const prevPageId = flowIdx > 0 ? schema.flow[flowIdx - 1] : null;

  function onChange(id: string, value: unknown) {
    setData((d) => ({ ...d, [id]: value }));
  }

  return (
    <div className="text-bb-black-00">
      {!isFirst && prevPageId && (
        <button
          type="button"
          onClick={() => onNavigate?.(prevPageId)}
          className="mb-s inline-flex items-center gap-xs text-bb-teal-00 underline underline-offset-2 hover:text-bb-black-00 hover:no-underline"
        >
          ← Back
        </button>
      )}

      {page.caption && schema.meta && (
        <p className="mb-xs border-l-4 border-bb-blue-40 py-xs pl-s text-bb-mid-grey-00">
          {schema.meta.title}
        </p>
      )}

      <h1 className="mb-m text-[3.5rem] font-bold leading-[1.15]">{page.title ?? page.id}</h1>

      {renderPageBody(page, data, onChange)}

      {/* Footer actions per page type */}
      {renderPageActions(page, data, onChange, isLast, nextPageId, onNavigate)}
    </div>
  );
}

function renderPageBody(
  page: Page,
  data: Record<string, unknown>,
  onChange: (id: string, value: unknown) => void,
) {
  if (page.type === 'start') {
    return (
      <div className="space-y-m text-[1.25rem]">
        {Array.isArray(page.intro)
          ? page.intro.map((line, i) => <p key={i}>{line}</p>)
          : page.intro && <p>{page.intro}</p>}
        {page.eligibility && (
          <div>
            <h2 className="mb-xs text-[1.5rem] font-bold">{page.eligibility.heading}</h2>
            <ul className="list-disc space-y-1 pl-6">
              {page.eligibility.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        )}
        {page.whatYouNeed && (
          <div>
            <h2 className="mb-xs text-[1.5rem] font-bold">{page.whatYouNeed.heading}</h2>
            <ul className="list-disc space-y-1 pl-6">
              {page.whatYouNeed.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (page.type === 'check') {
    return <p className="text-[1.25rem] text-bb-mid-grey-00">Check-your-answers preview appears here.</p>;
  }

  if (page.type === 'confirmation') {
    return (
      <div className="rounded-sm bg-bb-teal-00 p-m text-bb-white-00">
        <p className="text-[1.5rem]">Your reference number</p>
        <p className="text-[2rem] font-bold">REF-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-m">
      {page.type === 'declaration' && page.body && (
        <div className="border-l-4 border-bb-blue-40 bg-bb-blue-10 p-s text-[1.1rem] leading-relaxed">
          {page.body}
        </div>
      )}
      {(page.fields ?? [])
        .filter((f) => isVisible(f.showWhen, data))
        .map((f) => (
          <FieldRenderer key={f.id} field={f} data={data} onChange={onChange} />
        ))}
    </div>
  );
}

function renderPageActions(
  page: Page,
  _data: Record<string, unknown>,
  _onChange: (id: string, value: unknown) => void,
  isLast: boolean,
  nextPageId: string | null,
  onNavigate?: (id: string | null) => void,
) {
  if (page.type === 'confirmation') return null;
  const label = page.type === 'start'
    ? page.startButton ?? 'Start now'
    : isLast
      ? 'Submit'
      : page.type === 'check'
        ? 'Submit application'
        : 'Continue';
  return (
    <div className="mt-m flex gap-4">
      <button
        type="button"
        onClick={() => onNavigate?.(nextPageId)}
        className="inline-flex items-center justify-center gap-2 rounded-sm bg-bb-teal-00 px-xm py-s text-[1.25rem] text-bb-white-00 outline-none transition-colors hover:bg-[#1a777d] focus-visible:ring-4 focus-visible:ring-bb-teal-100"
      >
        {label}
      </button>
    </div>
  );
}

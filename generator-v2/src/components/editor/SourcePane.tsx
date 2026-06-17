import type { SourceDocument } from '../../types/schema';

interface SourcePaneProps {
  source: SourceDocument | null;
  activePage: number;
  onSelectPage: (n: number) => void;
}

/**
 * Left pane: shows the uploaded source document's pages as thumbnails.
 * When no source is attached (sample-schema mode), shows a friendly
 * placeholder.
 */
export function SourcePane({ source, activePage, onSelectPage }: SourcePaneProps) {
  return (
    <aside className="h-full overflow-y-auto border-r border-bb-grey-00 bg-[#f7f9fc] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.75rem] font-bold uppercase tracking-wide text-bb-mid-grey-00">
          Source{source ? ` · ${source.pages.length} page${source.pages.length > 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {!source && (
        <div className="rounded-md border border-dashed border-bb-blue-40 bg-bb-white-00 p-3 text-[0.8125rem] text-bb-mid-grey-00">
          No source document attached. Re-upload to see page images here.
        </div>
      )}

      {source?.pages.map((p) => (
        <button
          key={p.pageNumber}
          type="button"
          onClick={() => onSelectPage(p.pageNumber)}
          className={`mb-2 block w-full overflow-hidden rounded-sm border bg-bb-white-00 text-left transition-colors ${
            activePage === p.pageNumber ? 'border-2 border-bb-teal-00' : 'border-bb-grey-00 hover:border-bb-teal-00'
          }`}
        >
          {p.imageDataUrl ? (
            <img src={p.imageDataUrl} alt={`Page ${p.pageNumber}`} className="block w-full" />
          ) : (
            <div className="aspect-[8.5/11] bg-bb-grey-00 p-2 text-[0.625rem] text-bb-mid-grey-00">
              <p className="mb-1 font-semibold">Page {p.pageNumber}</p>
              <p className="line-clamp-[12]">{(p.textLayer ?? p.ocrText ?? '').slice(0, 280)}</p>
            </div>
          )}
          <p className="px-2 py-1 text-[0.6875rem] text-bb-mid-grey-00">Page {p.pageNumber}</p>
        </button>
      ))}

      {source && (
        <div className="mt-3 rounded-sm border border-bb-grey-00 bg-bb-white-00 p-2 text-[0.75rem] text-bb-mid-grey-00">
          <strong className="block text-bb-black-00">📄 {source.fileName}</strong>
          {formatBytes(source.fileSize)} · {source.fileType.toUpperCase()}
        </div>
      )}
    </aside>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

import { useEffect, useState } from 'react';
import { ChromeFrame } from '../chrome/ChromeFrame';
import { processFile } from '../../lib/ocr';
import { extractSchema } from '../../lib/extract';
import type { FormSchema, SourceDocument } from '../../types/schema';

interface ProcessingScreenProps {
  file: File;
  formName: string;
  onDone: (schema: FormSchema, source: SourceDocument) => void;
  onCancel: () => void;
}

export function ProcessingScreen({ file, formName, onDone, onCancel }: ProcessingScreenProps) {
  const [status, setStatus] = useState('Starting…');
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const source = await processFile(file, (msg, p) => {
          if (cancelled) return;
          setStatus(msg);
          if (typeof p === 'number') setPct(p);
        });
        if (cancelled) return;
        setStatus('Extracting fields with AI…');
        setPct(95);
        const schema = await extractSchema(source, {
          formName,
          onProgress: (msg) => !cancelled && setStatus(msg),
        });
        if (cancelled) return;
        setPct(100);
        onDone(schema, source);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Something went wrong.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, formName, onDone]);

  return (
    <ChromeFrame
      bannerSlot={
        <div className="py-xs flex items-center justify-between text-[1rem]">
          <span>
            Reading <strong>{file.name}</strong>…
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="text-bb-teal-00 underline underline-offset-2 hover:no-underline"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="govbb-container flex w-full max-w-2xl flex-1 flex-col justify-center py-l">
        <div className="rounded-lg border-2 border-bb-grey-00 bg-bb-white-00 p-m">
          {!error ? (
            <>
              <h1 className="text-[2rem] font-bold">⏳ Reading the form</h1>
              <p className="mt-xs text-[1.25rem] text-bb-mid-grey-00">{status}</p>
              <div className="mt-s h-2 w-full overflow-hidden rounded-full bg-bb-grey-00">
                <div
                  className="h-full bg-bb-teal-00 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-xs text-[1rem] text-bb-mid-grey-00">{pct}%</p>
            </>
          ) : (
            <>
              <h1 className="text-[2rem] font-bold text-bb-red-00">Something went wrong</h1>
              <p className="mt-xs text-[1.25rem]">{error}</p>
              <button
                type="button"
                onClick={onCancel}
                className="mt-s rounded-sm bg-bb-teal-00 px-xm py-s text-[1.25rem] text-bb-white-00 hover:bg-[#1a777d]"
              >
                Try a different file
              </button>
            </>
          )}
        </div>
      </div>
    </ChromeFrame>
  );
}

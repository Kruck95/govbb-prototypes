/**
 * Schema extraction layer.
 *
 * Sends the OCR'd / rasterised pages of the uploaded form to the backend
 * (`POST /api/extract`), which runs Claude with forced tool-use to return a
 * FormSchema matching form-schema.v1.json. The server normalises the result
 * (keyed pages, guaranteed start/check/confirmation pages, ordered flow), so
 * the editor and renderer can consume it directly.
 *
 * Requires the API server to be running with an ANTHROPIC_API_KEY:
 *   ANTHROPIC_API_KEY=sk-... npm run api
 * In dev, Vite proxies /api → http://localhost:3001 (see vite.config.ts).
 */

import type { FormSchema, SourceDocument } from '../types/schema';

export interface ExtractOptions {
  formName: string;
  mda?: string;
  onProgress?: (msg: string) => void;
}

export async function extractSchema(
  source: SourceDocument,
  opts: ExtractOptions,
): Promise<FormSchema> {
  const { formName, mda = '', onProgress = () => {} } = opts;

  onProgress('Reading the form with AI…');

  const payload = {
    formName,
    mda,
    fileType: source.fileType,
    pages: source.pages.map((p) => ({
      pageNumber: p.pageNumber,
      imageDataUrl: p.imageDataUrl,
      text: (p.textLayer || p.ocrText || '').trim() || undefined,
    })),
  };

  let res: Response;
  try {
    res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      'Could not reach the extraction server. Start it in a terminal with "npm run api" (with your ANTHROPIC_API_KEY set), then try again.',
    );
  }

  if (!res.ok) {
    // Try to read our server's JSON error first.
    let serverError = '';
    try {
      const data = await res.json();
      if (data?.error) serverError = data.error;
    } catch {
      /* body wasn't JSON — likely the dev proxy, see below */
    }
    if (serverError) throw new Error(serverError);

    // A 5xx with no JSON usually means the API server isn't running, so the
    // Vite dev proxy returned its own gateway error.
    if (res.status >= 500) {
      throw new Error(
        "The extraction server isn't running. Open a terminal in the project folder and start it with: ANTHROPIC_API_KEY=sk-... npm run api — then try again.",
      );
    }
    throw new Error(`Extraction failed (HTTP ${res.status}).`);
  }

  const schema = (await res.json()) as FormSchema;
  onProgress('Done');
  return schema;
}

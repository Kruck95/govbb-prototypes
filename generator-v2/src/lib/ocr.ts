/**
 * OCR pipeline.
 *
 * - PDF with text layer  → extract text via pdf.js (free, instant)
 * - PDF without text     → rasterize each page, OCR via tesseract.js
 * - Image (PNG/JPG/HEIC) → OCR via tesseract.js
 * - DOCX                 → mammoth → semantic HTML → text
 *
 * Output is a normalised SourceDocument the editor and the schema
 * extractor both consume.
 */

import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';
import mammoth from 'mammoth';
import type { SourceDocument, SourcePage } from '../types/schema';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export type ProgressFn = (msg: string, pct?: number) => void;

export async function processFile(file: File, onProgress: ProgressFn = () => {}): Promise<SourceDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type === 'application/pdf' || ext === 'pdf') {
    return processPdf(file, onProgress);
  }
  if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'heic', 'webp'].includes(ext)) {
    return processImage(file, onProgress);
  }
  if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return processDocx(file, onProgress);
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

async function processPdf(file: File, onProgress: ProgressFn): Promise<SourceDocument> {
  onProgress('Opening PDF…', 5);
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pageCount = pdf.numPages;
  const pages: SourcePage[] = [];

  for (let i = 1; i <= pageCount; i++) {
    onProgress(`Reading page ${i} of ${pageCount}…`, Math.floor(((i - 1) / pageCount) * 90) + 5);
    const page = await pdf.getPage(i);

    // Try the text layer first — cheap and accurate
    const textContent = await page.getTextContent();
    const textLayer = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ')
      .trim();

    // Always rasterize so the editor can show thumbnails / page images
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);

    let ocrText: string | undefined;
    let ocrConfidence: number | undefined;
    // Fall back to OCR only if the text layer is empty or trivially short
    if (textLayer.length < 30) {
      onProgress(`OCR on page ${i}…`, Math.floor(((i - 0.5) / pageCount) * 90) + 5);
      const result = await runTesseract(imageDataUrl);
      ocrText = result.text;
      ocrConfidence = result.confidence;
    }

    pages.push({
      pageNumber: i,
      imageDataUrl,
      textLayer: textLayer || undefined,
      ocrText,
      ocrConfidence,
    });
  }

  onProgress('Done', 100);
  return { fileName: file.name, fileType: 'pdf', fileSize: file.size, pages };
}

async function processImage(file: File, onProgress: ProgressFn): Promise<SourceDocument> {
  onProgress('Loading image…', 10);
  const imageDataUrl = await fileToDataUrl(file);
  onProgress('Reading text…', 40);
  const { text, confidence } = await runTesseract(imageDataUrl);
  onProgress('Done', 100);
  return {
    fileName: file.name,
    fileType: 'image',
    fileSize: file.size,
    pages: [{ pageNumber: 1, imageDataUrl, ocrText: text, ocrConfidence: confidence }],
  };
}

async function processDocx(file: File, onProgress: ProgressFn): Promise<SourceDocument> {
  onProgress('Reading Word document…', 30);
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  onProgress('Done', 100);
  return {
    fileName: file.name,
    fileType: 'docx',
    fileSize: file.size,
    pages: [{ pageNumber: 1, textLayer: result.value }],
  };
}

async function runTesseract(imageDataUrl: string): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(imageDataUrl);
    return { text: data.text ?? '', confidence: data.confidence ?? 0 };
  } finally {
    await worker.terminate();
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

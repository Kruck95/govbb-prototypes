import { useCallback, useRef, useState } from 'react';
import { ChromeFrame } from '../chrome/ChromeFrame';
import { SAMPLE_WORK_PERMIT } from '../../lib/sample-schema';
import type { FormSchema, SourceDocument } from '../../types/schema';

interface UploadScreenProps {
  onUpload: (file: File, formName: string) => void;
  onUseSample: (schema: FormSchema, source: SourceDocument | null) => void;
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.heic'];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');

export function UploadScreen({ onUpload, onUseSample }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [formName, setFormName] = useState('');

  const handleFiles = useCallback((fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setStagedFile(file);
    // Derive an initial form name from the filename
    const stem = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (!formName) setFormName(prettify(stem));
  }, [formName]);

  function handleContinue() {
    if (!stagedFile) return;
    onUpload(stagedFile, formName.trim() || 'Untitled form');
  }

  return (
    <ChromeFrame
      bannerSlot={
        <div className="py-xs text-[1rem]">
          <strong>Form Generator (Alpha)</strong> — turn a paper form into a clickable prototype.
        </div>
      }
    >
      <div className="govbb-container w-full max-w-3xl py-l">
        <h1 className="text-[3.5rem] font-bold leading-[1.15]">Form generator</h1>
        <p className="mt-xs text-[1.25rem] text-bb-mid-grey-00">
          Drop a paper form, scan, or Word document. We'll read it and turn it into an editable
          prototype.
        </p>

        {/* Drop zone */}
        <div
          className={`mt-m rounded-md border-[3px] border-dashed p-l text-center transition-colors ${
            over ? 'border-bb-teal-00 bg-bb-teal-10' : 'border-bb-blue-40 bg-bb-white-00'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="text-[3rem]" aria-hidden>📄</div>
          <p className="mt-xs text-[1.25rem] font-bold">Drop a form here</p>
          <p className="text-[1rem] text-bb-mid-grey-00">PDF · Word · scan · photo</p>
          <button
            type="button"
            className="mt-s rounded-sm bg-bb-teal-00 px-xm py-s text-[1.25rem] text-bb-white-00 hover:bg-[#1a777d]"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse my files
          </button>
          <p className="mt-xs text-[0.875rem] text-bb-mid-grey-00">
            or paste an image with Cmd-V
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Staged file panel */}
        {stagedFile && (
          <div className="mt-m rounded-md border-2 border-bb-black-00 bg-bb-white-00 p-s">
            <div className="flex items-center justify-between gap-s">
              <div className="min-w-0">
                <p className="truncate text-[1.25rem] font-bold">📄 {stagedFile.name}</p>
                <p className="text-[1rem] text-bb-mid-grey-00">
                  {formatBytes(stagedFile.size)} · {stagedFile.type || 'unknown type'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStagedFile(null)}
                className="shrink-0 text-[1rem] text-bb-teal-00 underline underline-offset-2 hover:no-underline"
              >
                Remove
              </button>
            </div>
            <label className="mt-s block">
              <span className="block text-[1.25rem] font-bold">Form name</span>
              <span className="block text-[1rem] text-bb-mid-grey-00">
                What is this form called? You can change this later.
              </span>
              <div className="mt-xs inline-flex w-full items-center rounded-sm border-2 border-bb-black-00 bg-bb-white-00 focus-within:ring-4 focus-within:ring-bb-teal-100">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-s text-[1.25rem] outline-none"
                  placeholder="e.g. Apply for a Work Permit"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!formName.trim()}
              className="mt-s rounded-sm bg-bb-teal-00 px-xm py-s text-[1.25rem] text-bb-white-00 hover:bg-[#1a777d] disabled:opacity-50"
            >
              Read this form →
            </button>
          </div>
        )}

        {/* Or shortcut */}
        <div className="my-m flex items-center gap-s">
          <div className="h-px flex-1 bg-bb-grey-00" />
          <span className="text-[1rem] text-bb-mid-grey-00">or try the sample</span>
          <div className="h-px flex-1 bg-bb-grey-00" />
        </div>

        <button
          type="button"
          onClick={() => onUseSample(SAMPLE_WORK_PERMIT, null)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-bb-black-00 bg-bb-white-00 px-xm py-s text-[1.25rem] hover:bg-bb-yellow-10"
        >
          ✦ Skip upload — open a sample Work Permit form
        </button>
      </div>
    </ChromeFrame>
  );
}

function prettify(input: string): string {
  if (!input) return '';
  return input
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

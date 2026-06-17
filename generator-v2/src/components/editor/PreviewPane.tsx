import { useState } from 'react';
import type { FormSchema } from '../../types/schema';
import { FormRenderer } from '../renderer/FormRenderer';

type Device = 'phone' | 'tablet' | 'desktop';

interface PreviewPaneProps { schema: FormSchema; pageId: string; }

export function PreviewPane({ schema, pageId }: PreviewPaneProps) {
  const [device, setDevice] = useState<Device>('phone');
  const [previewPageId, setPreviewPageId] = useState(pageId);

  // Keep preview in sync when the editor switches pages
  if (previewPageId !== pageId) setPreviewPageId(pageId);

  const widthClass = device === 'phone' ? 'max-w-[360px]' : device === 'tablet' ? 'max-w-[640px]' : 'max-w-full';

  return (
    <div className="h-full overflow-y-auto bg-bb-blue-10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.75rem] font-bold uppercase tracking-wide text-bb-mid-grey-00">
          Live preview
        </span>
      </div>

      {/* Device toggle */}
      <div className="mb-3 inline-flex overflow-hidden rounded-sm border border-bb-blue-40">
        <DeviceBtn active={device === 'phone'} onClick={() => setDevice('phone')}>📱 Phone</DeviceBtn>
        <DeviceBtn active={device === 'tablet'} onClick={() => setDevice('tablet')}>📱 Tablet</DeviceBtn>
        <DeviceBtn active={device === 'desktop'} onClick={() => setDevice('desktop')}>🖥 Desktop</DeviceBtn>
      </div>

      {/* Device frame */}
      <div className={`mx-auto rounded-lg border border-bb-blue-40 bg-bb-white-00 p-4 transition-[max-width] duration-200 ${widthClass}`}>
        <FormRenderer
          key={previewPageId /* reset field data when the page changes */}
          schema={schema}
          pageId={previewPageId}
          onNavigate={(next) => next && setPreviewPageId(next)}
        />
      </div>
    </div>
  );
}

function DeviceBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-[0.75rem] font-semibold ${active ? 'bg-bb-teal-00 text-bb-white-00' : 'bg-bb-white-00 text-bb-black-00 hover:bg-bb-teal-10'}`}
    >
      {children}
    </button>
  );
}

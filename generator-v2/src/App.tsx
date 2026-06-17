import { useCallback, useState } from 'react';
import type { FormSchema, SourceDocument } from './types/schema';
import { UploadScreen } from './components/upload/UploadScreen';
import { ProcessingScreen } from './components/processing/ProcessingScreen';
import { EditorScreen } from './components/editor/EditorScreen';

type Route =
  | { name: 'upload' }
  | { name: 'processing'; file: File; formName: string }
  | { name: 'editor'; schema: FormSchema; source: SourceDocument | null };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'upload' });

  const goToProcessing = useCallback((file: File, formName: string) => {
    setRoute({ name: 'processing', file, formName });
  }, []);

  const goToEditor = useCallback((schema: FormSchema, source: SourceDocument | null) => {
    setRoute({ name: 'editor', schema, source });
  }, []);

  const goToUpload = useCallback(() => {
    setRoute({ name: 'upload' });
  }, []);

  switch (route.name) {
    case 'upload':
      return <UploadScreen onUpload={goToProcessing} onUseSample={goToEditor} />;
    case 'processing':
      return (
        <ProcessingScreen
          file={route.file}
          formName={route.formName}
          onDone={goToEditor}
          onCancel={goToUpload}
        />
      );
    case 'editor':
      return <EditorScreen initialSchema={route.schema} source={route.source} onBack={goToUpload} />;
  }
}

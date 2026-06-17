/**
 * TypeScript mirror of /schemas/form-schema.v1.json — the single source
 * of truth shared by the renderer, the editor, and the export step.
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'file'
  | 'static';

export type Confidence = 'high' | 'medium' | 'low';

export interface Validation {
  required?: boolean;
  pattern?: string;
  patternMessage?: string;
  maxLength?: number;
  notFuture?: boolean;
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface Condition {
  sourceFieldId: string;
  comparator: 'equals' | 'notEquals' | 'isAnswered' | 'isNotAnswered' | 'contains';
  value?: string;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  hint?: string;
  placeholder?: string;
  options?: (string | ChoiceOption)[];
  rows?: number;
  inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal' | 'search' | 'url';
  required?: boolean;
  validation?: Validation;
  showWhen?: ConditionGroup;
  confidence?: Confidence;
  sourcePage?: number;
}

export type PageType = 'start' | 'question' | 'declaration' | 'check' | 'confirmation';

export interface Page {
  id: string;
  type: PageType;
  title?: string;
  caption?: boolean;
  body?: string;
  fields?: Field[];
  intro?: string | string[];
  eligibility?: { heading: string; items: string[] };
  whatYouNeed?: { heading: string; items: string[] };
  startButton?: string;
}

export interface FormMeta {
  title: string;
  mda: string;
  serviceType?: string;
  status: 'alpha' | 'beta' | 'live' | 'retired';
  referencePrefix: string;
  estimatedTime?: string;
  lastUpdated?: string;
  prototypeFile?: string;
}

export interface FormValidationSettings {
  enabled: boolean;
  mode?: 'onContinue' | 'onBlur' | 'onSubmitOnly';
}

export interface FormSchema {
  id: string;
  version: string;
  meta: FormMeta;
  validation: FormValidationSettings;
  flow: string[];
  pages: Record<string, Page>;
}

/* ─── Editor-only state types (not persisted to JSON) ────────────────── */

export interface SourceDocument {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'image';
  fileSize: number;
  pages: SourcePage[];
}

export interface SourcePage {
  pageNumber: number;
  imageDataUrl?: string;
  textLayer?: string;
  ocrText?: string;
  ocrConfidence?: number;
}

export interface EditorState {
  schema: FormSchema;
  currentPageId: string;
  selectedFieldId: string | null;
  source: SourceDocument | null;
  dirty: boolean;
}

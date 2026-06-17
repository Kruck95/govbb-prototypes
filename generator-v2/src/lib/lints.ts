import type { FormSchema } from '../types/schema';

export type LintLevel = 'block' | 'warn' | 'info';
export interface Lint {
  level: LintLevel;
  code: string;
  message: string;
  /** Where the lint applies, for navigation/highlight */
  location?: { pageId?: string; fieldId?: string };
}

const BARBADOS_PARISHES = [
  'Christ Church',
  'St. Andrew',
  'St. George',
  'St. James',
  'St. John',
  'St. Joseph',
  'St. Lucy',
  'St. Michael',
  'St. Peter',
  'St. Philip',
  'St. Thomas',
];

const BUREAUCRATIC = ['please', 'kindly', 'hereby', 'shall', 'pursuant', 'aforementioned', 'submit'];

/**
 * Run schema lints. Phase 1 surfaces everything as 'warn' or 'info' —
 * never 'block'. The locked spec is "warnings only, never block save."
 */
export function lintSchema(schema: FormSchema): Lint[] {
  const out: Lint[] = [];

  // Basic structural checks
  if (!schema.flow.length) out.push({ level: 'warn', code: 'empty-flow', message: 'Form has no pages in its flow.' });
  if (!schema.flow.includes('confirmation') && !schema.flow.some((id) => schema.pages[id]?.type === 'confirmation')) {
    out.push({ level: 'warn', code: 'no-confirmation', message: 'No confirmation page in the flow. Citizens won\'t see a "what happens next" screen.' });
  }
  if (!schema.flow.some((id) => schema.pages[id]?.type === 'check')) {
    out.push({ level: 'warn', code: 'no-check', message: 'No check-your-answers page. Best practice is to let citizens review before submitting.' });
  }

  // Per-field lints
  for (const pageId of schema.flow) {
    const page = schema.pages[pageId];
    if (!page?.fields) continue;
    for (const field of page.fields) {
      // Parish select must contain the 11 parishes
      if (
        field.type === 'select' &&
        /parish/i.test(field.label) &&
        !arrayEquals(normaliseOptions(field.options), BARBADOS_PARISHES)
      ) {
        out.push({
          level: 'warn',
          code: 'parish-list',
          message: `"${field.label}" looks like a parish field. It should list all 11 Barbados parishes.`,
          location: { pageId, fieldId: field.id },
        });
      }

      // NRN field should have the YYMMDD-XXXX regex
      if (
        /national.registration.number|\bNRN\b/i.test(field.label + ' ' + field.id) &&
        field.validation?.pattern !== '^[0-9]{6}-[0-9]{4}$'
      ) {
        out.push({
          level: 'warn',
          code: 'nrn-pattern',
          message: `"${field.label}" looks like an NRN field. Add the regex ^[0-9]{6}-[0-9]{4}$ so citizens enter it the right way.`,
          location: { pageId, fieldId: field.id },
        });
      }

      // Plain-language check on labels
      for (const term of BUREAUCRATIC) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(field.label)) {
          out.push({
            level: 'info',
            code: 'plain-language',
            message: `"${field.label}" contains "${term}" — consider plainer language.`,
            location: { pageId, fieldId: field.id },
          });
        }
      }

      // Low-confidence flag passthrough
      if (field.confidence === 'low') {
        out.push({
          level: 'warn',
          code: 'low-confidence',
          message: `"${field.label}" was extracted with low confidence — verify against the source.`,
          location: { pageId, fieldId: field.id },
        });
      }
    }
  }

  return out;
}

function normaliseOptions(opts: FormSchema['pages'][string]['fields'] extends infer F ? F : never): string[] {
  // Helper signature is awkward — keep it simple:
  if (!Array.isArray(opts)) return [];
  return (opts as unknown[]).map((o) => (typeof o === 'string' ? o : (o as { label: string }).label));
}

function arrayEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

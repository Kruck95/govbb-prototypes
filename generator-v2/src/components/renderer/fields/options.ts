import type { ChoiceOption } from '../../../types/schema';

export function normalizeOptions(options: (string | ChoiceOption)[] | undefined): ChoiceOption[] {
  if (!options) return [];
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

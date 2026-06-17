import type { ConditionGroup } from '../../types/schema';

/**
 * Evaluate a ConditionGroup against the current data. Returns true when
 * the field/page should be shown. Undefined group → always true.
 */
export function isVisible(
  group: ConditionGroup | undefined,
  data: Record<string, unknown>,
): boolean {
  if (!group || !group.conditions.length) return true;
  const results = group.conditions.map((c) => evalOne(c, data));
  return group.operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

function evalOne(c: ConditionGroup['conditions'][number], data: Record<string, unknown>): boolean {
  const v = data[c.sourceFieldId];
  switch (c.comparator) {
    case 'equals':
      return v === c.value;
    case 'notEquals':
      return v !== c.value;
    case 'isAnswered':
      return v !== undefined && v !== null && v !== '' && v !== false;
    case 'isNotAnswered':
      return v === undefined || v === null || v === '' || v === false;
    case 'contains':
      if (Array.isArray(v)) return v.includes(c.value);
      if (typeof v === 'string') return v.includes(c.value ?? '');
      return false;
  }
}

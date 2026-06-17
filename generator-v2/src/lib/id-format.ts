/**
 * Barbados National Registration Number (NRN) / National Identification (ID)
 * Number formatting.
 *
 * The number is always six digits, a hyphen, then four digits: 939218-7644.
 * These helpers detect such a field and force that shape as the user types,
 * so the prototype can never hold a badly formatted ID.
 */

import type { Field } from '../types/schema';

/** A clearly-fake example shown as the placeholder / hint. */
export const NRN_EXAMPLE = '939218-7644';

/** True if a validation pattern represents "6 digits - 4 digits". */
export function isIdNumberPattern(pattern?: string): boolean {
  if (!pattern) return false;
  // Normalise \d → [0-9] and strip whitespace so equivalent patterns match.
  const norm = pattern.replace(/\\d/g, '[0-9]').replace(/\s/g, '');
  return norm.includes('[0-9]{6}-[0-9]{4}');
}

/**
 * True if a field is a national ID / registration number, detected by its
 * validation pattern OR its label. Deliberately does NOT match "National
 * Insurance Number" (a different, 6-digit, no-hyphen field).
 */
export function isNationalIdField(field: Field): boolean {
  if (isIdNumberPattern(field.validation?.pattern)) return true;
  const label = field.label.toLowerCase();
  return /national\s*(id|identification|registration)/.test(label) || /\bnrn\b/.test(label);
}

/** Force "xxxxxx-xxxx": digits only, max 10, hyphen after the sixth. */
export function formatNrn(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  return digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits;
}

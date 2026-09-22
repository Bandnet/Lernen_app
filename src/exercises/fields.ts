import { ExerciseImportError } from './errors';

export type Raw = Record<string, unknown>;

export function isPlainObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Required, non-empty string (trimmed). */
export function requireString(raw: Raw, field: string, n: number, max: number): string {
  const value = raw[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ExerciseImportError('errExFieldMissing', { n, field });
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ExerciseImportError('errExFieldTooLong', { n, field, max });
  return trimmed;
}

/** Optional string; missing/empty -> undefined, wrong type -> error. */
export function optionalString(raw: Raw, field: string, n: number, max: number): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ExerciseImportError('errExFieldMissing', { n, field });
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > max) throw new ExerciseImportError('errExFieldTooLong', { n, field, max });
  return trimmed;
}

export function requireStringArray(
  raw: Raw,
  field: string,
  n: number,
  opts: { min: number; max: number; itemMax: number },
): string[] {
  const value = raw[field];
  if (!Array.isArray(value) || value.length < opts.min || value.length > opts.max) {
    throw new ExerciseImportError('errExListSize', { n, field, min: opts.min, max: opts.max });
  }
  return value.map((item) => {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ExerciseImportError('errExFieldMissing', { n, field });
    }
    if (item.trim().length > opts.itemMax) {
      throw new ExerciseImportError('errExFieldTooLong', { n, field, max: opts.itemMax });
    }
    return item.trim();
  });
}

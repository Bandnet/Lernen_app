import { ExerciseImportError } from './errors';
import { isPlainObject, optionalString, requireString } from './fields';
import type { Exercise } from './model';
import { getDefinition } from './registry';

export const MAX_EXERCISES = 500;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface ParsedExerciseSet {
  title: string;
  exercises: Exercise[];
}

/**
 * Validates untrusted data and returns a clean, normalised exercise set.
 * Only known fields are copied, so unexpected properties never reach the app.
 * Accepts `{ version, title, exercises: [...] }` or a bare array of exercises.
 */
export function parseExerciseSetObject(input: unknown, fallbackTitle: string): ParsedExerciseSet {
  let list: unknown;
  let title = fallbackTitle;

  if (Array.isArray(input)) {
    list = input;
  } else if (isPlainObject(input)) {
    if (input.version !== undefined && input.version !== 1) {
      throw new ExerciseImportError('errExVersion', { version: String(input.version).slice(0, 20) });
    }
    if (typeof input.title === 'string' && input.title.trim()) title = input.title.trim().slice(0, 120);
    list = input.exercises;
  } else {
    throw new ExerciseImportError('errExFormat');
  }

  if (!Array.isArray(list)) throw new ExerciseImportError('errExFormat');
  if (list.length === 0) throw new ExerciseImportError('errExEmpty');
  if (list.length > MAX_EXERCISES) throw new ExerciseImportError('errExTooMany', { max: MAX_EXERCISES });

  const seenIds = new Set<string>();
  const exercises: Exercise[] = [];

  list.forEach((item, index) => {
    const n = index + 1;
    if (!isPlainObject(item)) throw new ExerciseImportError('errExNotObject', { n });

    const type = item.type;
    if (typeof type !== 'string') throw new ExerciseImportError('errExFieldMissing', { n, field: 'type' });
    const definition = getDefinition(type);
    if (!definition) throw new ExerciseImportError('errExUnknownType', { n, type: type.slice(0, 40) });

    let id: string;
    if (item.id === undefined) id = `q${n}`;
    else if (typeof item.id === 'string' || typeof item.id === 'number') id = String(item.id).trim().slice(0, 80);
    else throw new ExerciseImportError('errExFieldMissing', { n, field: 'id' });
    if (id === '') throw new ExerciseImportError('errExFieldMissing', { n, field: 'id' });
    if (seenIds.has(id)) throw new ExerciseImportError('errExDuplicateId', { id });
    seenIds.add(id);

    const question = requireString(item, 'question', n, 2000);
    const explanation = optionalString(item, 'explanation', n, 4000);

    exercises.push({
      id,
      type: definition.type,
      question,
      ...(explanation ? { explanation } : {}),
      ...definition.parse(item, n),
    } as Exercise);
  });

  return { title, exercises };
}

export function parseExerciseSetText(text: string, fallbackTitle: string): ParsedExerciseSet {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ExerciseImportError('errExInvalidJson');
  }
  return parseExerciseSetObject(data, fallbackTitle);
}

/** Reads and validates a JSON file chosen by the user. */
export async function readExerciseFile(file: File): Promise<ParsedExerciseSet> {
  if (!/\.json$/i.test(file.name)) throw new ExerciseImportError('errExFileType');
  if (file.size === 0) throw new ExerciseImportError('errEmptyFile');
  if (file.size > MAX_FILE_BYTES) throw new ExerciseImportError('errFileTooLarge', { max: MAX_FILE_BYTES / (1024 * 1024) });
  const fallbackTitle = file.name.replace(/\.json$/i, '');
  return parseExerciseSetText(await file.text(), fallbackTitle);
}

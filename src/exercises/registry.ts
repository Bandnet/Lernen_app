import type { ExerciseTypeDefinition } from './definition';
import { multipleChoice } from './types/multipleChoice';
import { textInput } from './types/textInput';
import { trueFalse } from './types/trueFalse';

/**
 * Register every exercise type here. Future types (multiple answers, matching,
 * ordering, fill in the blank, image questions ...) only need a definition file
 * next to the existing ones plus one line in this list.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const definitions: ExerciseTypeDefinition<any, any>[] = [multipleChoice, trueFalse, textInput];

const byType = new Map(definitions.map((d) => [d.type as string, d]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDefinition(type: string): ExerciseTypeDefinition<any, any> | undefined {
  return byType.get(type);
}

export const supportedTypes = definitions.map((d) => d.type as string);

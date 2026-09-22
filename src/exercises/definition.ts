import type { ComponentType } from 'react';
import type { TranslationKey } from '../i18n/translations';
import type { Exercise, ExerciseBase } from './model';
import type { Raw } from './fields';

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Outcome of checking an answer; texts are ready to display. */
export interface CheckResult {
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
}

export interface ExerciseViewProps<E, A> {
  exercise: E;
  answer: A;
  onChange: (answer: A) => void;
  /** Called when the user submits from inside the view (e.g. Enter in a text field). */
  onSubmit: () => void;
  /** True after the answer was checked. */
  locked: boolean;
  result: CheckResult | null;
}

/**
 * Everything the app needs to know about one exercise type: how to validate it
 * from JSON, how to check an answer and which component displays it.
 * `E` is the exercise, `A` the type of the user's answer while answering.
 */
export interface ExerciseTypeDefinition<E extends Exercise = Exercise, A = unknown> {
  type: E['type'];
  /** Translation key for the human-readable name. */
  labelKey: TranslationKey;
  /** Validates the type-specific fields (common fields are handled centrally). */
  parse(raw: Raw, n: number): Omit<E, keyof ExerciseBase | 'type'>;
  initialAnswer(exercise: E): A;
  isAnswered(answer: A): boolean;
  check(exercise: E, answer: A, t: Translate): CheckResult;
  View: ComponentType<ExerciseViewProps<E, A>>;
}

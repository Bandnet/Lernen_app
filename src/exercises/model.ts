/**
 * Exercise data model. Every exercise has the common fields below plus
 * type-specific fields. To add a new type: add its interface here, add it to
 * the `Exercise` union, and create + register a definition (see registry.ts).
 */
export interface ExerciseBase {
  id: string;
  question: string;
  explanation?: string;
}

export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple_choice';
  options: string[];
  /** Index of the correct option (0 = first). */
  answer: number;
}

export interface TrueFalseExercise extends ExerciseBase {
  type: 'true_false';
  answer: boolean;
}

export interface TextInputExercise extends ExerciseBase {
  type: 'text_input';
  answer: string;
  /** Additional answers that are also correct. */
  acceptedAnswers?: string[];
  /** Default: false (capitalisation is ignored). */
  caseSensitive?: boolean;
}

export type Exercise = MultipleChoiceExercise | TrueFalseExercise | TextInputExercise;
export type ExerciseTypeName = Exercise['type'];

/** The exercises of one topic as stored in the database. `topicId` is the key. */
export interface ExerciseSetRecord {
  topicId: string;
  version: 1;
  title: string;
  exercises: Exercise[];
  createdAt: number;
  updatedAt: number;
}

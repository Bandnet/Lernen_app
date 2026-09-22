/**
 * Learning progress of one topic (one record per topic, `topicId` is the key).
 * Progress = share of the exercises whose most recent answer was correct.
 * Exercise ids are kept in two lists so ids from imported files can never
 * clash with special object keys.
 */
export interface ProgressRecord {
  topicId: string;
  /** Number of exercises in the set when the progress was last updated. */
  total: number;
  correctIds: string[];
  incorrectIds: string[];
  /** Completed sessions (quitting early does not count). */
  attempts: number;
  lastRun?: { correct: number; total: number; at: number };
  updatedAt: number;
}

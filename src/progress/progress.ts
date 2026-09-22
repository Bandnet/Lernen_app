import type { ProgressRecord } from './model';

export interface ExerciseOutcome {
  exerciseId: string;
  correct: boolean;
}

/** 0–100. */
export function progressPercent(record: ProgressRecord): number {
  if (record.total <= 0) return 0;
  return Math.min(100, Math.round((record.correctIds.length / record.total) * 100));
}

/**
 * Merges the outcomes of one session into the stored progress.
 * `completed` is false when the learner quit before the end.
 */
export function applyOutcomes(
  previous: ProgressRecord | null | undefined,
  topicId: string,
  total: number,
  outcomes: ExerciseOutcome[],
  completed: boolean,
  now: number = Date.now(),
): ProgressRecord {
  const correct = new Set(previous?.correctIds ?? []);
  const incorrect = new Set(previous?.incorrectIds ?? []);
  for (const { exerciseId, correct: isCorrect } of outcomes) {
    if (isCorrect) {
      correct.add(exerciseId);
      incorrect.delete(exerciseId);
    } else {
      incorrect.add(exerciseId);
      correct.delete(exerciseId);
    }
  }
  return {
    topicId,
    total,
    correctIds: [...correct],
    incorrectIds: [...incorrect],
    attempts: (previous?.attempts ?? 0) + (completed ? 1 : 0),
    lastRun: completed
      ? { correct: outcomes.filter((o) => o.correct).length, total: outcomes.length, at: now }
      : previous?.lastRun,
    updatedAt: now,
  };
}

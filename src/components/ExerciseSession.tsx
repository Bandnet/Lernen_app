import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { CheckResult } from '../exercises/definition';
import type { Exercise } from '../exercises/model';
import { getDefinition } from '../exercises/registry';
import { Button } from './Button';
import { ExerciseFeedback } from './ExerciseFeedback';
import { ProgressBar } from './ProgressBar';
import { ResultScreen } from './ResultScreen';

interface Props {
  /** Exercises in the order they should be asked (already filtered/shuffled). */
  exercises: Exercise[];
  onRestart: (exercises: Exercise[]) => void;
  /** Leaves after the result screen. */
  onExit: () => void;
  /** Called once when the last question was answered and the result screen appears. */
  onFinish: (outcomes: SessionOutcome[]) => void;
  /** Called when the learner quits before the end. */
  onQuit: (outcomes: SessionOutcome[]) => void;
}

export interface SessionOutcome {
  exercise: Exercise;
  correct: boolean;
}

/** One learning run: shows question after question, checks answers and ends with a result screen. */
export function ExerciseSession({ exercises, onRestart, onExit, onFinish, onQuit }: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<unknown>(() => getDefinition(exercises[0].type)?.initialAnswer(exercises[0]));
  const [result, setResult] = useState<CheckResult | null>(null);
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>([]);
  const [finished, setFinished] = useState(false);

  if (finished) {
    const correct = outcomes.filter((o) => o.correct).length;
    return (
      <ResultScreen
        correct={correct}
        total={outcomes.length}
        onRetryAll={() => onRestart(exercises)}
        onRetryWrong={() => onRestart(outcomes.filter((o) => !o.correct).map((o) => o.exercise))}
        onExit={onExit}
      />
    );
  }

  const exercise = exercises[index];
  const definition = getDefinition(exercise.type);
  if (!definition) return null; // filtered out before, kept as a safety net
  const total = exercises.length;
  const isLast = index === total - 1;

  const check = () => {
    if (result || !definition.isAnswered(answer)) return;
    const checked = definition.check(exercise, answer, t);
    setResult(checked);
    setOutcomes((prev) => [...prev, { exercise, correct: checked.correct }]);
  };

  function next() {
    if (isLast) {
      onFinish(outcomes);
      setFinished(true);
      return;
    }
    const nextExercise = exercises[index + 1];
    setIndex(index + 1);
    setAnswer(getDefinition(nextExercise.type)?.initialAnswer(nextExercise));
    setResult(null);
  }

  const View = definition.View;
  return (
    <div className="session fade-in">
      <div className="session-top">
        <span className="session-count">{t('questionOf', { current: index + 1, total })}</span>
        <Button variant="ghost" onClick={() => onQuit(outcomes)}>{t('quitSession')}</Button>
      </div>
      <ProgressBar value={((index + (result ? 1 : 0)) / total) * 100} />

      <div className="card session-card fade-in" key={index}>
        <h2 className="question">{exercise.question}</h2>
        <View
          exercise={exercise}
          answer={answer}
          onChange={setAnswer}
          onSubmit={check}
          locked={result !== null}
          result={result}
        />
        {result && <ExerciseFeedback result={result} explanation={exercise.explanation} />}
        <div className="session-actions">
          {result ? (
            <Button key="next" variant="primary" autoFocus onClick={next}>
              {isLast ? t('showResult') : t('nextQuestion')}
            </Button>
          ) : (
            <Button key="check" variant="primary" disabled={!definition.isAnswered(answer)} onClick={check}>
              {t('checkAnswer')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

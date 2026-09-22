import { ExerciseImportError } from '../errors';
import { requireStringArray } from '../fields';
import type { ExerciseTypeDefinition, ExerciseViewProps } from '../definition';
import type { MultipleChoiceExercise } from '../model';

function MultipleChoiceView({ exercise, answer, onChange, locked }: ExerciseViewProps<MultipleChoiceExercise, number | null>) {
  return (
    <div className="options" role="radiogroup">
      {exercise.options.map((option, i) => {
        const state = locked
          ? i === exercise.answer
            ? 'correct'
            : i === answer
              ? 'wrong'
              : ''
          : i === answer
            ? 'selected'
            : '';
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === answer}
            disabled={locked}
            className={`option ${state}`}
            onClick={() => onChange(i)}
          >
            <span className="option-mark" />
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

export const multipleChoice: ExerciseTypeDefinition<MultipleChoiceExercise, number | null> = {
  type: 'multiple_choice',
  labelKey: 'typeMultipleChoice',
  parse(raw, n) {
    const options = requireStringArray(raw, 'options', n, { min: 2, max: 8, itemMax: 500 });
    const answer = raw.answer;
    if (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      throw new ExerciseImportError('errExAnswerIndex', { n });
    }
    return { options, answer };
  },
  initialAnswer: () => null,
  isAnswered: (answer) => answer !== null,
  check(exercise, answer) {
    return {
      correct: answer === exercise.answer,
      userAnswer: answer === null ? '' : exercise.options[answer],
      correctAnswer: exercise.options[exercise.answer],
    };
  },
  View: MultipleChoiceView,
};

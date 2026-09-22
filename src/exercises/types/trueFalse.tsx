import { useI18n } from '../../i18n/I18nProvider';
import { ExerciseImportError } from '../errors';
import type { ExerciseTypeDefinition, ExerciseViewProps } from '../definition';
import type { TrueFalseExercise } from '../model';

function TrueFalseView({ exercise, answer, onChange, locked }: ExerciseViewProps<TrueFalseExercise, boolean | null>) {
  const { t } = useI18n();
  const choices: { value: boolean; label: string }[] = [
    { value: true, label: t('optionTrue') },
    { value: false, label: t('optionFalse') },
  ];
  return (
    <div className="options two" role="radiogroup">
      {choices.map(({ value, label }) => {
        const state = locked
          ? value === exercise.answer
            ? 'correct'
            : value === answer
              ? 'wrong'
              : ''
          : value === answer
            ? 'selected'
            : '';
        return (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={value === answer}
            disabled={locked}
            className={`option center ${state}`}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export const trueFalse: ExerciseTypeDefinition<TrueFalseExercise, boolean | null> = {
  type: 'true_false',
  labelKey: 'typeTrueFalse',
  parse(raw, n) {
    if (typeof raw.answer !== 'boolean') throw new ExerciseImportError('errExAnswerBoolean', { n });
    return { answer: raw.answer };
  },
  initialAnswer: () => null,
  isAnswered: (answer) => answer !== null,
  check(exercise, answer, t) {
    const label = (value: boolean) => (value ? t('optionTrue') : t('optionFalse'));
    return {
      correct: answer === exercise.answer,
      userAnswer: answer === null ? '' : label(answer),
      correctAnswer: label(exercise.answer),
    };
  },
  View: TrueFalseView,
};

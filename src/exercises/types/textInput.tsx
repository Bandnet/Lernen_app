import { useI18n } from '../../i18n/I18nProvider';
import { requireString, requireStringArray } from '../fields';
import { ExerciseImportError } from '../errors';
import type { ExerciseTypeDefinition, ExerciseViewProps } from '../definition';
import type { TextInputExercise } from '../model';

/**
 * Forgiving comparison: ignores surrounding whitespace, repeated spaces,
 * leading/trailing punctuation and (by default) capitalisation.
 */
export function normalizeText(value: string, caseSensitive: boolean): string {
  const cleaned = value
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.,;:!?]+|[.,;:!?]+$/g, '')
    .trim();
  return caseSensitive ? cleaned : cleaned.toLowerCase();
}

function TextInputView({ exercise, answer, onChange, onSubmit, locked, result }: ExerciseViewProps<TextInputExercise, string>) {
  const { t } = useI18n();
  const state = result ? (result.correct ? 'correct' : 'wrong') : '';
  return (
    <input
      className={`input text-answer ${state}`}
      value={answer}
      disabled={locked}
      autoFocus
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      placeholder={t('textPlaceholder')}
      aria-label={exercise.question}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !locked) {
          e.preventDefault();
          onSubmit();
        }
      }}
    />
  );
}

export const textInput: ExerciseTypeDefinition<TextInputExercise, string> = {
  type: 'text_input',
  labelKey: 'typeTextInput',
  parse(raw, n) {
    const answer = requireString(raw, 'answer', n, 500);
    const result: Omit<TextInputExercise, 'id' | 'type' | 'question' | 'explanation'> = { answer };
    if (raw.acceptedAnswers !== undefined) {
      result.acceptedAnswers = requireStringArray(raw, 'acceptedAnswers', n, { min: 0, max: 20, itemMax: 500 });
    }
    if (raw.caseSensitive !== undefined) {
      if (typeof raw.caseSensitive !== 'boolean') throw new ExerciseImportError('errExFieldMissing', { n, field: 'caseSensitive' });
      result.caseSensitive = raw.caseSensitive;
    }
    return result;
  },
  initialAnswer: () => '',
  isAnswered: (answer) => answer.trim() !== '',
  check(exercise, answer) {
    const cs = exercise.caseSensitive ?? false;
    const given = normalizeText(answer, cs);
    const accepted = [exercise.answer, ...(exercise.acceptedAnswers ?? [])].map((a) => normalizeText(a, cs));
    return { correct: given !== '' && accepted.includes(given), userAnswer: answer.trim(), correctAnswer: exercise.answer };
  },
  View: TextInputView,
};

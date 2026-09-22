import { useI18n } from '../i18n/I18nProvider';
import type { CheckResult } from '../exercises/definition';

export function ExerciseFeedback({ result, explanation }: { result: CheckResult; explanation?: string }) {
  const { t } = useI18n();
  return (
    <div className={`feedback ${result.correct ? 'ok' : 'bad'}`} role="status">
      <div className="feedback-title">
        {result.correct ? '✓' : '✕'} {result.correct ? t('resultCorrect') : t('resultWrong')}
      </div>
      {!result.correct && (
        <dl className="feedback-answers">
          <dt>{t('yourAnswer')}</dt>
          <dd>{result.userAnswer || t('noAnswer')}</dd>
          <dt>{t('correctAnswer')}</dt>
          <dd>{result.correctAnswer}</dd>
        </dl>
      )}
      {explanation && (
        <p className="feedback-explanation">
          <strong>{t('explanationLabel')}:</strong> {explanation}
        </p>
      )}
    </div>
  );
}

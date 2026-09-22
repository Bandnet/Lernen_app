import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

interface Props {
  correct: number;
  total: number;
  onRetryAll: () => void;
  onRetryWrong: () => void;
  onExit: () => void;
}

export function ResultScreen({ correct, total, onRetryAll, onRetryWrong, onExit }: Props) {
  const { t } = useI18n();
  const wrong = total - correct;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);

  return (
    <div className="card result fade-in">
      <h2>{t('sessionDone')}</h2>
      <div className="result-score">{t('scoreOf', { score: correct, total })}</div>
      <div className="result-pct">{pct}%</div>
      <ProgressBar value={pct} />
      <div className="result-stats">
        <span className="stat ok">✓ {t('correctCount', { count: correct })}</span>
        <span className="stat bad">✕ {t('incorrectCount', { count: wrong })}</span>
      </div>
      <div className="result-actions">
        <Button variant="primary" onClick={onRetryAll}>{t('retryAll')}</Button>
        {wrong > 0 && <Button onClick={onRetryWrong}>{t('retryWrong')}</Button>}
        <Button variant="ghost" onClick={onExit}>{t('backToTopic')}</Button>
      </div>
    </div>
  );
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

function CrashScreen() {
  const { t } = useI18n();
  return (
    <div className="page">
      <EmptyState title={t('errorCrashTitle')} text={t('errorCrashText')}>
        <div className="header-actions">
          <Button variant="primary" onClick={() => window.location.reload()}>{t('reloadPage')}</Button>
          <Button
            onClick={() => {
              window.location.hash = '#/';
              window.location.reload();
            }}
          >
            {t('toDashboard')}
          </Button>
        </div>
      </EmptyState>
    </div>
  );
}

/** Last line of defence: an unexpected rendering error shows a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Technical details go to the console only, never to the user.
    console.error(error, info.componentStack);
  }

  render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}

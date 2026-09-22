import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { readMirror, writeMirror } from '../utils/mirror';
import { useInstall } from '../pwa/install';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

const DISMISS_KEY = 'install-banner-dismissed';

/** Small dismissible banner offering to install the app; adapts to platform. */
export function InstallBanner() {
  const { t } = useI18n();
  const { promptInstall, showIosInstructions, installed } = useInstall();
  const [dismissed, setDismissed] = useState(() => readMirror(DISMISS_KEY) === '1');
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed || dismissed || (!promptInstall && !showIosInstructions)) return null;

  function dismiss() {
    setDismissed(true);
    writeMirror(DISMISS_KEY, '1');
  }

  return (
    <>
      <div className="install-banner fade-in">
        <div className="install-banner-icon">
          <img src="./icons/icon-96.png" width={36} height={36} alt="" />
        </div>
        <div className="install-banner-text">
          <strong>{t('installTitle')}</strong>
          <span>{t('installText')}</span>
        </div>
        <div className="install-banner-actions">
          <Button
            variant="primary"
            onClick={() => (promptInstall ? void promptInstall() : setShowIosHelp(true))}
          >
            {t('install')}
          </Button>
          <Button variant="ghost" iconOnly icon="trash" aria-label={t('dismiss')} title={t('dismiss')} onClick={dismiss} />
        </div>
      </div>

      {showIosHelp && (
        <Modal title={t('installTitle')} onClose={() => setShowIosHelp(false)}>
          <ol className="install-steps">
            <li>
              <Icon name="share" size={18} /> {t('iosStep1')}
            </li>
            <li>{t('iosStep2')}</li>
            <li>{t('iosStep3')}</li>
          </ol>
          <div className="modal-actions">
            <Button variant="primary" onClick={() => setShowIosHelp(false)}>{t('ok')}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

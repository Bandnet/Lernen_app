import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { Modal } from './Modal';

/** Simple dialog with a message and an OK button (used for error messages). */
export function MessageDialog({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-text">{message}</p>
      <div className="modal-actions">
        <Button variant="primary" autoFocus onClick={onClose}>{t('ok')}</Button>
      </div>
    </Modal>
  );
}

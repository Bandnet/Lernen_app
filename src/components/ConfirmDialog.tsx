import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError(t('errorGeneric'));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-text">{message}</p>
      {error && <p className="field-error">{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={busy}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

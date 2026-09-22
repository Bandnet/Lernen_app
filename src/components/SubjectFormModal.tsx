import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { MAX_NAME_LENGTH } from '../utils/constants';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  /** Present when renaming. */
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function SubjectFormModal({ initialName, onSubmit, onClose }: Props) {
  const { t } = useI18n();
  const editing = initialName !== undefined;
  const [name, setName] = useState(initialName ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(t('errorRequired'));
    if (trimmed.length > MAX_NAME_LENGTH) return setError(t('errorTooLong', { max: MAX_NAME_LENGTH }));
    setBusy(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch {
      setError(t('errorGeneric'));
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? t('renameSubject') : t('newSubject')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">{t('subjectName')}</span>
          <input
            className="input"
            autoFocus
            value={name}
            placeholder={t('subjectNamePlaceholder')}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </label>
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {editing ? t('save') : t('createSubject')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Subject, Topic, TopicInput } from '../types/models';
import { DEFAULT_TOPIC_COLOR, DEFAULT_TOPIC_ICON, MAX_NAME_LENGTH, TOPIC_COLORS, TOPIC_ICONS } from '../utils/constants';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  subjects: Subject[];
  /** Preselected subject when creating. */
  defaultSubjectId?: string;
  /** Present when editing an existing topic. */
  topic?: Topic;
  onSubmit: (values: TopicInput) => Promise<void>;
  onClose: () => void;
}

export function TopicFormModal({ subjects, defaultSubjectId, topic, onSubmit, onClose }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(topic?.name ?? '');
  const [subjectId, setSubjectId] = useState(topic?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? '');
  const [description, setDescription] = useState(topic?.description ?? '');
  const [icon, setIcon] = useState(topic?.icon ?? DEFAULT_TOPIC_ICON);
  const [color, setColor] = useState(topic?.color ?? DEFAULT_TOPIC_COLOR);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(t('errorRequired'));
    if (trimmed.length > MAX_NAME_LENGTH) return setError(t('errorTooLong', { max: MAX_NAME_LENGTH }));
    if (!subjectId) return setError(t('errorSubjectRequired'));
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, subjectId, description, icon, color });
      onClose();
    } catch {
      setError(t('errorGeneric'));
      setBusy(false);
    }
  }

  return (
    <Modal title={topic ? t('editTopicTitle') : t('createTopicTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">{t('topicName')}</span>
          <input
            className="input"
            autoFocus
            value={name}
            placeholder={t('topicNamePlaceholder')}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </label>

        <label className="field">
          <span className="field-label">{t('subject')}</span>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t('description')}</span>
          <textarea
            className="input"
            rows={2}
            value={description}
            placeholder={t('descriptionPlaceholder')}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">{t('icon')}</span>
          <div className="picker">
            {TOPIC_ICONS.map((i) => (
              <button
                type="button"
                key={i}
                className={`picker-icon ${i === icon ? 'selected' : ''}`}
                onClick={() => setIcon(i)}
                aria-pressed={i === icon}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">{t('color')}</span>
          <div className="picker">
            {TOPIC_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${c === color ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={c === color}
              />
            ))}
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {topic ? t('save') : t('createTopic')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

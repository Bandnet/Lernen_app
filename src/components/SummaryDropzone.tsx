import { useRef, useState, type DragEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { SUMMARY_ACCEPT } from '../summary/importSummary';
import { Button } from './Button';

interface Props {
  busy: boolean;
  onFiles: (files: File[]) => void;
}

export function SummaryDropzone({ busy, onFiles }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) onFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <h3>{busy ? t('importing') : t('summaryDropTitle')}</h3>
      <p>{t('summaryDropText')}</p>
      <Button variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
        {t('chooseFile')}
      </Button>
      <p className="dropzone-hint">{t('summaryDropHint')}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={SUMMARY_ACCEPT}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ''; // allow choosing the same file again
          if (files.length > 0) onFiles(files);
        }}
      />
    </div>
  );
}
